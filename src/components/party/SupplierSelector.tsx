import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supplierApi } from '../../api/party.api';
import { queryKeys } from '../../api/queryKeys';
import { SupplierDto } from '../../types/party.types';
import { Select, SelectOption } from '../ui/Select';

export interface SupplierSelectorProps {
  value?: string;
  onChange: (supplierId: string, supplier?: SupplierDto) => void;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  initialSupplier?: SupplierDto;
  className?: string;
}

export const SupplierSelector: React.FC<SupplierSelectorProps> = ({
  value = '',
  onChange,
  label = 'Supplier',
  error,
  helperText,
  disabled = false,
  required = false,
  placeholder = 'Select supplier...',
  initialSupplier,
  className,
}) => {
  const [search, _setSearch] = useState('');

  // Fetch active suppliers
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.suppliers.list({ search, isActive: true, size: 100 }),
    queryFn: ({ signal }) =>
      supplierApi.getSuppliers(
        {
          search: search || undefined,
          isActive: true,
          size: 100,
        },
        signal
      ),
  });

  const suppliersList = data?.data || [];

  // Build select options
  const options: SelectOption[] = [
    { value: '', label: isLoading ? 'Loading suppliers...' : placeholder },
  ];

  // If initial/saved supplier is inactive or outside top page, preserve it
  if (initialSupplier && !suppliersList.some((s) => s.id === initialSupplier.id)) {
    options.push({
      value: initialSupplier.id,
      label: `[${initialSupplier.supplierCode}] ${initialSupplier.name}${
        initialSupplier.city ? ` (${initialSupplier.city})` : ''
      }${!initialSupplier.isActive ? ' (Inactive)' : ''}`,
    });
  }

  // Add loaded active suppliers
  suppliersList.forEach((s) => {
    if (!options.some((opt) => opt.value === s.id)) {
      options.push({
        value: s.id,
        label: `[${s.supplierCode}] ${s.name}${s.city ? ` (${s.city})` : ''}${
          s.contactPerson ? ` - ${s.contactPerson}` : ''
        }`,
      });
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedSupplier =
      suppliersList.find((s) => s.id === selectedId) ||
      (initialSupplier?.id === selectedId ? initialSupplier : undefined);
    onChange(selectedId, selectedSupplier);
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
