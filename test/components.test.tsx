import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../src/components/ui/Button';
import { PasswordInput } from '../src/components/ui/PasswordInput';
import { Modal } from '../src/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../src/components/ui/Table';

describe('Shared UI Components', () => {
  describe('Button', () => {
    it('renders with primary teal styling and handles click', async () => {
      const user = userEvent.setup();
      let clicked = false;
      render(
        <Button variant="primary" onClick={() => (clicked = true)}>
          Click Me
        </Button>
      );

      const btn = screen.getByRole('button', { name: 'Click Me' });
      expect(btn).toHaveClass('bg-teal-700');
      await user.click(btn);
      expect(clicked).toBe(true);
    });

    it('disables button when isLoading is true', () => {
      render(<Button isLoading>Submit</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });
  });

  describe('PasswordInput', () => {
    it('toggles password visibility with eye button', async () => {
      const user = userEvent.setup();
      render(<PasswordInput label="Secret" id="pass-field" />);

      const input = screen.getByLabelText('Secret');
      expect(input).toHaveAttribute('type', 'password');

      const toggleBtn = screen.getByLabelText('Show password');
      await user.click(toggleBtn);

      expect(input).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
    });
  });

  describe('Table Alignments', () => {
    it('renders left alignment for text and right alignment for money', () => {
      render(
        <Table ariaLabel="Test table">
          <TableHeader>
            <TableRow>
              <TableHead align="left">Name</TableHead>
              <TableHead align="right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell align="left">PVC Pipe 1L</TableCell>
              <TableCell align="right">₹1,500.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Name')).toHaveClass('text-left');
      expect(screen.getByText('Amount')).toHaveClass('text-right');
      expect(screen.getByText('PVC Pipe 1L')).toHaveClass('text-left');
      expect(screen.getByText('₹1,500.00')).toHaveClass('text-right');
    });
  });

  describe('Modal', () => {
    it('renders dialog with accessible title and closes on Escape key', async () => {
      const user = userEvent.setup();
      let closed = false;
      render(
        <Modal
          isOpen={true}
          onClose={() => (closed = true)}
          title="Modal Title"
          description="Modal description"
        >
          <div>Modal Content</div>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modal Title')).toBeInTheDocument();
      expect(screen.getByText('Modal description')).toBeInTheDocument();

      // Press Escape
      await user.keyboard('{Escape}');
      expect(closed).toBe(true);
    });
  });
});
