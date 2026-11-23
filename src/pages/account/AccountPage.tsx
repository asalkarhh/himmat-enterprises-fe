import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, KeyRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';
import { DateDisplay } from '../../components/ui/DateDisplay';
import { ApiError } from '../../types/api.types';

export const AccountPage: React.FC = () => {
  const { user, changePassword, isOwner } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Current password is required.');
      return;
    }

    if (!newPassword) {
      setError('New password is required.');
      return;
    }

    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await changePassword({ currentPassword, newPassword });
      success('Password changed successfully. Active sessions invalidated. Please sign in again.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to update password.');
      } else {
        setError('Failed to update password. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="My Account"
        subtitle="Manage your profile information and account security."
      />

      {/* User Information Card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-base shadow-sm">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <CardTitle>{user?.displayName || 'User Profile'}</CardTitle>
            <p className="text-xs text-slate-500">@{user?.username}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 pt-2">
            <div>
              <span className="text-xs text-slate-500 block">User ID</span>
              <span className="text-sm font-mono font-medium text-slate-800">{user?.id}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Assigned Role</span>
              <div className="mt-1">
                <Badge variant={isOwner ? 'default' : 'neutral'}>
                  {user?.role}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Account Status</span>
              <div className="mt-1">
                <Badge variant={user?.isActive ? 'success' : 'danger'}>
                  {user?.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Account Created</span>
              <DateDisplay date={user?.createdAt} type="timestamp" className="text-sm font-medium" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Last Updated</span>
              <DateDisplay date={user?.updatedAt} type="timestamp" className="text-sm font-medium" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Record Version</span>
              <span className="text-sm font-mono text-slate-700">v{user?.version}</span>
            </div>
          </div>

          {user?.permissions && user.permissions.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">
                Granted System Permissions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {user.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>Change Password</CardTitle>
            <p className="text-xs text-slate-500">
              Must be at least 12 characters. Changing password will invalidate existing tokens.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md" noValidate>
            {error && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                {error}
              </div>
            )}

            <PasswordInput
              label="Current Password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              disabled={isLoading}
            />

            <PasswordInput
              label="New Password"
              required
              helperText="Minimum 12 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              disabled={isLoading}
            />

            <PasswordInput
              label="Confirm New Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={isLoading}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={isLoading}
                leftIcon={<Lock className="w-4 h-4" />}
              >
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountPage;
