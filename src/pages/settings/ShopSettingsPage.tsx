import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, AlertTriangle, RefreshCw } from 'lucide-react';
import { settingsApi } from '../../api/settings.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { DateDisplay } from '../../components/ui/DateDisplay';
import { ApiError } from '../../types/api.types';
import { UpdateShopSettingsRequest } from '../../types/settings.types';

export const ShopSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [formData, setFormData] = useState<UpdateShopSettingsRequest>({
    expectedVersion: 0,
    name: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    stateCode: '',
    currency: '',
    timezone: '',
    creditDays: 30,
    invoicePrefix: 'INV-',
  });

  const [conflictError, setConflictError] = useState<string | null>(null);

  const {
    data: settings,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.settings.shop(),
    queryFn: ({ signal }) => settingsApi.getShopSettings(signal),
    staleTime: 60000,
  });

  // Sync loaded settings into form
  useEffect(() => {
    if (settings) {
      setFormData({
        expectedVersion: settings.version,
        name: settings.name || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        gstin: settings.gstin || '',
        stateCode: settings.stateCode || '',
        currency: settings.currency || 'INR',
        timezone: settings.timezone || 'Asia/Kolkata',
        creditDays: settings.creditDays ?? 30,
        invoicePrefix: settings.invoicePrefix || 'INV-',
      });
      setConflictError(null);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateShopSettingsRequest) =>
      settingsApi.updateShopSettings(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.settings.shop(), updated);
      success('Shop settings updated successfully');
      setConflictError(null);
    },
    onError: (err: ApiError) => {
      if (err.status === 409 || err.code === 'STALE_VERSION') {
        setConflictError(
          'Conflict detected: Another user modified shop settings since you loaded them. Please reload the latest settings before applying edits.'
        );
      } else {
        toastError(err.message || 'Failed to update shop settings');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    if (!formData.name.trim()) {
      toastError('Shop name is required');
      return;
    }

    updateMutation.mutate(formData);
  };

  const handleReload = () => {
    refetch();
    setConflictError(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Shop Settings"
        subtitle="Manage your business identity, tax details, and invoicing defaults."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleReload}
            isLoading={isFetching}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Reload
          </Button>
        }
      />

      {isError && (
        <ErrorMessage
          error={error}
          title="Failed to load shop settings"
          onRetry={handleReload}
        />
      )}

      {conflictError && (
        <div
          role="alert"
          className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 shadow-sm flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold">Version Conflict (409 Stale Version)</h4>
            <p className="text-xs mt-1 leading-relaxed">{conflictError}</p>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReload}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="border-amber-300 text-amber-900 hover:bg-amber-100"
              >
                Reload Latest Version
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="h-96 bg-white border border-slate-200 rounded-xl p-6 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-6" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-slate-200 rounded" />
            <div className="h-10 bg-slate-200 rounded" />
            <div className="h-20 bg-slate-200 rounded col-span-2" />
          </div>
        </div>
      ) : settings ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Business Configuration</CardTitle>
                <p className="text-xs text-slate-500">
                  Version {settings.version} • Last updated <DateDisplay date={settings.updatedAt} type="timestamp" />
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Shop Name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Himmat Enterprises"
                    disabled={updateMutation.isPending}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Textarea
                    label="Business Address"
                    rows={2}
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter physical shop address"
                    disabled={updateMutation.isPending}
                  />
                </div>

                <Input
                  label="Contact Phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  disabled={updateMutation.isPending}
                />

                <Input
                  label="Email Address"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. contact@himmat.com"
                  disabled={updateMutation.isPending}
                />

                <Input
                  label="GSTIN Number"
                  value={formData.gstin || ''}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  disabled={updateMutation.isPending}
                />

                <Input
                  label="State Code"
                  value={formData.stateCode || ''}
                  onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                  placeholder="e.g. 27 (Maharashtra)"
                  disabled={updateMutation.isPending}
                />

                <Input
                  label="Default Invoice Prefix"
                  value={formData.invoicePrefix || ''}
                  onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                  placeholder="INV-"
                  disabled={updateMutation.isPending}
                />

                <Input
                  label="Standard Credit Period (Days)"
                  type="number"
                  min="0"
                  value={formData.creditDays ?? 30}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      creditDays: e.target.value === '' ? null : parseInt(e.target.value, 10),
                    })
                  }
                  disabled={updateMutation.isPending}
                />

                <Input
                  label="Currency"
                  value={formData.currency || 'INR'}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  disabled={updateMutation.isPending}
                />

                <Input
                  label="Timezone"
                  value={formData.timezone || 'Asia/Kolkata'}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Submits expectedVersion {formData.expectedVersion}
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={updateMutation.isPending}
                  disabled={updateMutation.isPending || !!conflictError}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Settings
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default ShopSettingsPage;
