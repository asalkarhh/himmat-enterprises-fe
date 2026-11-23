import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customerSiteApi } from '../../api/party.api';
import { queryKeys } from '../../api/queryKeys';
import { CustomerSiteDto } from '../../types/party.types';
import { Select, SelectOption } from '../ui/Select';

export interface CustomerSiteSelectorProps {
  customerId?: string | null;
  value?: string;
  onChange: (siteId: string, site?: CustomerSiteDto) => void;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  initialSite?: CustomerSiteDto;
  className?: string;
}

export const CustomerSiteSelector: React.FC<CustomerSiteSelectorProps> = ({
  customerId,
  value = '',
  onChange,
  label = 'Delivery Site',
  error,
  helperText,
  disabled = false,
  required = false,
  placeholder = 'No specific site (Direct counter / Shop delivery)',
  initialSite,
  className,
}) => {
  const previousCustomerIdRef = useRef<string | null | undefined>(customerId);

  // Clear site selection whenever parent customer changes
  useEffect(() => {
    if (previousCustomerIdRef.current !== undefined && previousCustomerIdRef.current !== customerId) {
      if (value) {
        onChange('', undefined);
      }
    }
    previousCustomerIdRef.current = customerId;
  }, [customerId, value, onChange]);

  // Fetch active sites for the selected customer
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.customerSites.list(customerId || '', { isActive: true, size: 100 }),
    queryFn: ({ signal }) =>
      customerSiteApi.getSites(customerId!, { isActive: true, size: 100 }, signal),
    enabled: !!customerId,
  });

  const sitesList = data?.data || [];

  // Build select options
  const options: SelectOption[] = [
    {
      value: '',
      label: !customerId
        ? 'Select a customer first'
        : isLoading
        ? 'Loading customer sites...'
        : placeholder,
    },
  ];

  // If we have an initial/historical site that belongs to this customer
  if (
    initialSite &&
    String(initialSite.customerId) === String(customerId) &&
    !sitesList.some((s) => s.id === initialSite.id)
  ) {
    options.push({
      value: initialSite.id,
      label: `${initialSite.siteName}${initialSite.city ? ` (${initialSite.city})` : ''}${
        !initialSite.isActive ? ' (Inactive)' : ''
      }`,
    });
  }

  // Add loaded active sites
  sitesList.forEach((s) => {
    if (!options.some((opt) => opt.value === s.id)) {
      options.push({
        value: s.id,
        label: `${s.siteName}${s.city ? ` (${s.city})` : ''}${
          s.contactPerson ? ` - Contact: ${s.contactPerson}` : ''
        }`,
      });
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedSite =
      sitesList.find((s) => s.id === selectedId) ||
      (initialSite?.id === selectedId ? initialSite : undefined);
    onChange(selectedId, selectedSite);
  };

  return (
    <Select
      label={label}
      value={value}
      onChange={handleChange}
      options={options}
      error={error}
      helperText={helperText}
      disabled={disabled || !customerId || isLoading}
      required={required}
      className={className}
    />
  );
};
