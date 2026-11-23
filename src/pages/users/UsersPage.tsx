import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, RefreshCw } from 'lucide-react';
import { userApi } from '../../api/user.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { DateDisplay } from '../../components/ui/DateDisplay';
import { EmptyState } from '../../components/ui/EmptyState';
import { UserRole, UserSummaryDto } from '../../types/auth.types';
import { CreateUserRequest, UpdateUserRequest } from '../../types/user.types';
import { ApiError } from '../../types/api.types';

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success } = useToast();

  const [page, setPage] = useState(0);
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummaryDto | null>(null);

  // Form states for Create User
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('MANAGER');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Form states for Edit User
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('MANAGER');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.users.list({ page, role: roleFilter, isActive: activeFilter }),
    queryFn: ({ signal }) =>
      userApi.getUsers(
        {
          page,
          size: 15,
          role: roleFilter,
          isActive: activeFilter,
        },
        signal
      ),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserRequest) => userApi.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      success('User created successfully');
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err: ApiError) => {
      setCreateError(err.message || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserRequest }) =>
      userApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      success('User updated successfully');
      setEditingUser(null);
    },
    onError: (err: ApiError) => {
      setEditError(err.message || 'Failed to update user');
    },
  });

  const resetCreateForm = () => {
    setNewUsername('');
    setNewDisplayName('');
    setNewRole('MANAGER');
    setNewPassword('');
    setCreateError(null);
  };

  const handleOpenEdit = (user: UserSummaryDto) => {
    setEditingUser(user);
    setEditDisplayName(user.displayName);
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setEditError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newUsername.trim() || newUsername.length < 3) {
      setCreateError('Username must be at least 3 characters.');
      return;
    }
    if (!newDisplayName.trim()) {
      setCreateError('Display name is required.');
      return;
    }
    if (!newPassword || newPassword.length < 12) {
      setCreateError('Password must be at least 12 characters.');
      return;
    }

    createMutation.mutate({
      username: newUsername.trim(),
      displayName: newDisplayName.trim(),
      role: newRole,
      password: newPassword,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    if (!editDisplayName.trim()) {
      setEditError('Display name is required.');
      return;
    }

    updateMutation.mutate({
      id: editingUser.id,
      payload: {
        expectedVersion: editingUser.version,
        displayName: editDisplayName.trim(),
        role: editRole,
        isActive: editIsActive,
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Roles"
        subtitle="Manage authorized staff access and administrative permissions (Owner only)."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              isLoading={isFetching}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create User
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-40">
            <Select
              options={[
                { label: 'All Roles', value: '' },
                { label: 'Owner', value: 'OWNER' },
                { label: 'Manager', value: 'MANAGER' },
              ]}
              value={roleFilter || ''}
              onChange={(e) => {
                setRoleFilter((e.target.value as UserRole) || undefined);
                setPage(0);
              }}
              className="py-1.5 text-xs"
            />
          </div>

          <div className="w-40">
            <Select
              options={[
                { label: 'All Statuses', value: '' },
                { label: 'Active', value: 'true' },
                { label: 'Inactive', value: 'false' },
              ]}
              value={activeFilter === undefined ? '' : String(activeFilter)}
              onChange={(e) => {
                const val = e.target.value;
                setActiveFilter(val === '' ? undefined : val === 'true');
                setPage(0);
              }}
              className="py-1.5 text-xs"
            />
          </div>
        </div>

        <span className="text-xs text-slate-500">
          Showing page {page + 1} of {Math.max(data?.totalPages || 1, 1)}
        </span>
      </div>

      {isError && (
        <ErrorMessage
          error={error}
          title="Failed to load users"
          onRetry={() => refetch()}
        />
      )}

      {/* Users Table */}
      <div className="space-y-4">
        <Table ariaLabel="System users table">
          <TableHeader>
            <TableRow>
              <TableHead align="left">ID</TableHead>
              <TableHead align="left">User</TableHead>
              <TableHead align="left">Username</TableHead>
              <TableHead align="center">Role</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="left">Created</TableHead>
              <TableHead align="right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton columns={7} rows={5} />
            ) : data?.data && data.data.length > 0 ? (
              data.data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell align="left" className="font-mono text-xs text-slate-500">
                    #{u.id}
                  </TableCell>
                  <TableCell align="left">
                    <span className="font-medium text-slate-900 block">{u.displayName}</span>
                  </TableCell>
                  <TableCell align="left" className="font-mono text-xs text-slate-600">
                    @{u.username}
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={u.role === 'OWNER' ? 'default' : 'neutral'} size="sm">
                      {u.role === 'OWNER' ? 'Owner' : 'Manager'}
                    </Badge>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={u.isActive ? 'success' : 'danger'} size="sm">
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell align="left" className="text-xs text-slate-500">
                    <DateDisplay date={u.createdAt} type="timestamp" />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(u)}
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center p-8">
                  <EmptyState
                    title="No users found"
                    description="No system user accounts match the selected filters."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            pageSize={data.size}
            onPageChange={setPage}
            isZeroIndexed={true}
          />
        )}
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetCreateForm();
        }}
        title="Create New User"
        description="Add a new Owner or Manager staff account."
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4" noValidate>
          {createError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {createError}
            </div>
          )}

          <Input
            label="Username"
            required
            autoComplete="off"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="e.g. rahul.m"
            helperText="Alphanumeric, dots, hyphens, or underscores (min 3 chars)"
            disabled={createMutation.isPending}
          />

          <Input
            label="Display Name"
            required
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            placeholder="e.g. Rahul Mehta"
            disabled={createMutation.isPending}
          />

          <Select
            label="Role"
            required
            options={[
              { label: 'Manager (Operational)', value: 'MANAGER' },
              { label: 'Owner (Administrative & Full Access)', value: 'OWNER' },
            ]}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
            disabled={createMutation.isPending}
          />

          <PasswordInput
            label="Initial Password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 12 characters"
            helperText="Must be at least 12 characters long"
            disabled={createMutation.isPending}
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetCreateForm();
              }}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending}
              disabled={createMutation.isPending}
            >
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit User: @${editingUser?.username}`}
        description="Update staff profile, role, or active status."
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
          {editError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {editError}
            </div>
          )}

          <Input
            label="Display Name"
            required
            value={editDisplayName}
            onChange={(e) => setEditDisplayName(e.target.value)}
            disabled={updateMutation.isPending}
          />

          <Select
            label="Role"
            required
            options={[
              { label: 'Manager', value: 'MANAGER' },
              { label: 'Owner', value: 'OWNER' },
            ]}
            value={editRole}
            onChange={(e) => setEditRole(e.target.value as UserRole)}
            disabled={updateMutation.isPending}
          />

          <div className="pt-2">
            <Checkbox
              label="Account is Active"
              description="Inactive accounts cannot log in to the portal."
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Version {editingUser?.version}
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setEditingUser(null)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={updateMutation.isPending}
                disabled={updateMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UsersPage;
