import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { variantApi } from '../../api/catalog.api';
import { queryKeys } from '../../api/queryKeys';
import { ProductVariantDto } from '../../types/catalog.types';
import { Select, SelectOption } from '../ui/Select';

export interface VariantSelectorProps {
  value?: string;
  onChange: (variantId: string, variant?: ProductVariantDto) => void;
  excludeVariantIds?: (string | number)[];
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  initialVariant?: ProductVariantDto;
  className?: string;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  value = '',
  onChange,
  excludeVariantIds = [],
  label,
  error,
  helperText,
  disabled = false,
  required = false,
  placeholder = 'Select product variant...',
  initialVariant,
  className,
}) => {
  const [search, _setSearch] = useState('');

  // Fetch active variants for adjustment selection
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.variants.list({ search, isActive: true, size: 100 }),
    queryFn: ({ signal }) =>
      variantApi.getVariants(
        {
          search: search || undefined,
          isActive: true,
          size: 100,
        },
        signal
      ),
  });

  const variantsList = data?.data || [];

  const excludedSet = new Set(excludeVariantIds.map(String));

  // Build select options
  const options: SelectOption[] = [
    { value: '', label: isLoading ? 'Loading variants...' : placeholder },
  ];

  // If initialVariant is provided and not in the list, keep it
  if (initialVariant && !variantsList.some((v) => v.id === initialVariant.id)) {
    options.push({
      value: initialVariant.id,
      label: `[${initialVariant.sku}] ${initialVariant.productName} (${initialVariant.sizeLabel})${!initialVariant.isActive ? ' (Inactive)' : ''}`,
      disabled: excludedSet.has(initialVariant.id) && initialVariant.id !== value,
    });
  }

  variantsList.forEach((v) => {
    if (!options.some((opt) => opt.value === v.id)) {
      const isExcluded = excludedSet.has(v.id) && v.id !== value;
      options.push({
        value: v.id,
        label: `[${v.sku}] ${v.productName} (${v.sizeLabel})${isExcluded ? ' — Already selected' : ''}`,
        disabled: isExcluded,
      });
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedVariant =
      variantsList.find((v) => v.id === selectedId) ||
      (initialVariant?.id === selectedId ? initialVariant : undefined);
    onChange(selectedId, selectedVariant);
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
