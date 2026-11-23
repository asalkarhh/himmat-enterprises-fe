import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../../api/party.api';
import { queryKeys } from '../../api/queryKeys';
import { CustomerDto } from '../../types/party.types';
import { Select, SelectOption } from '../ui/Select';

export interface CustomerSelectorProps {
  value?: string;
  onChange: (customerId: string, customer?: CustomerDto) => void;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  initialCustomer?: CustomerDto;
  className?: string;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value = '',
  onChange,
  label = 'Customer',
  error,
  helperText,
  disabled = false,
  required = false,
  placeholder = 'Select customer...',
  initialCustomer,
  className,
}) => {
  const [search, _setSearch] = useState('');

  // Fetch active customers
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.customers.list({ search, isActive: true, size: 100 }),
    queryFn: ({ signal }) =>
      customerApi.getCustomers(
        {
          search: search || undefined,
          isActive: true,
          size: 100,
        },
        signal
      ),
  });

  const customersList = data?.data || [];

  // Build select options
  const options: SelectOption[] = [
    { value: '', label: isLoading ? 'Loading customers...' : placeholder },
  ];

  // If we have an initial/saved historical customer that is inactive or not in the top results, include it
  if (initialCustomer && !customersList.some((c) => c.id === initialCustomer.id)) {
    options.push({
      value: initialCustomer.id,
      label: `[${initialCustomer.customerCode}] ${initialCustomer.name} (${initialCustomer.customerType})${
        initialCustomer.phone ? ` • ${initialCustomer.phone}` : ''
      }${!initialCustomer.isActive ? ' (Inactive)' : ''}`,
    });
  }

  // Add loaded active customers
  customersList.forEach((c) => {
    // Avoid duplicate if already added via initialCustomer
    if (!options.some((opt) => opt.value === c.id)) {
      options.push({
        value: c.id,
        label: `[${c.customerCode}] ${c.name} (${c.customerType})${c.phone ? ` • ${c.phone}` : ''}`,
      });
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedCustomer =
      customersList.find((c) => c.id === selectedId) ||
      (initialCustomer?.id === selectedId ? initialCustomer : undefined);
    onChange(selectedId, selectedCustomer);
  };

  return (
    <Select
      label={label}
      value={value}
      onChange={handleChange}
      options={options}
      error={error}
      helperText={helperText}
      disabled={disabled || isLoading}
      required={required}
      className={className}
    />
  );
};
