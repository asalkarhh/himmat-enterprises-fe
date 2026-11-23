import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentComponentsInput } from '../src/components/finance/PaymentComponentsInput';
import { PaymentComponentDto } from '../src/types/purchase.types';

describe('FE05 PaymentComponentsInput Component', () => {
  it('renders a single CASH row without online reference field', () => {
    const components: PaymentComponentDto[] = [
      { method: 'CASH', amount: '1500.00', onlineReference: '' },
    ];
    const onChange = vi.fn();

    render(<PaymentComponentsInput components={components} onChange={onChange} />);

    expect(screen.getByText('Payment Split / Tendered Modes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1500.00')).toBeInTheDocument();
    // Online reference field should not be visible for CASH
    expect(screen.queryByPlaceholderText('Txn / UTR / Cheque Ref...')).not.toBeInTheDocument();
  });

  it('renders online reference field when method is ONLINE', () => {
    const components: PaymentComponentDto[] = [
      { method: 'ONLINE', amount: '2500.00', onlineReference: 'UTR-12345678' },
    ];
    const onChange = vi.fn();

    render(<PaymentComponentsInput components={components} onChange={onChange} />);

    expect(screen.getByDisplayValue('2500.00')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Txn / UTR / Cheque Ref...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('UTR-12345678')).toBeInTheDocument();
  });

  it('calls onChange with updated component when amount changes', () => {
    const components: PaymentComponentDto[] = [
      { method: 'CASH', amount: '500', onlineReference: '' },
    ];
    const onChange = vi.fn();

    render(<PaymentComponentsInput components={components} onChange={onChange} />);

    const input = screen.getByDisplayValue('500');
    fireEvent.change(input, { target: { value: '750.50' } });

    expect(onChange).toHaveBeenCalledWith([
      { method: 'CASH', amount: '750.50', onlineReference: '' },
    ]);
  });

  it('calls onChange with a new blank row when Add Mode is clicked', () => {
    const components: PaymentComponentDto[] = [
      { method: 'CASH', amount: '1000.00', onlineReference: '' },
    ];
    const onChange = vi.fn();

    render(<PaymentComponentsInput components={components} onChange={onChange} />);

    const addButton = screen.getByRole('button', { name: /Add Mode/i });
    fireEvent.click(addButton);

    expect(onChange).toHaveBeenCalledWith([
      { method: 'CASH', amount: '1000.00', onlineReference: '' },
      { method: 'CASH', amount: '', onlineReference: '' },
    ]);
  });

  it('allows removing rows when more than one mode exists', () => {
    const components: PaymentComponentDto[] = [
      { method: 'CASH', amount: '1000.00', onlineReference: '' },
      { method: 'ONLINE', amount: '500.00', onlineReference: 'UTR-999' },
    ];
    const onChange = vi.fn();

    render(<PaymentComponentsInput components={components} onChange={onChange} />);

    const removeButtons = screen.getAllByTitle('Remove component');
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[1]);
    expect(onChange).toHaveBeenCalledWith([
      { method: 'CASH', amount: '1000.00', onlineReference: '' },
    ]);
  });
});
