import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useIdempotentMutation } from '../src/hooks/useIdempotentMutation';
import { ApiError } from '../src/types/api.types';

describe('useIdempotentMutation & Optimistic Versioning', () => {
  it('generates a unique Idempotency-Key for a logical submission', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', success: true });

    const { result } = renderHook(() =>
      useIdempotentMutation({ mutationFn })
    );

    await act(async () => {
      await result.current.mutate({ amount: '500.00' });
    });

    expect(mutationFn).toHaveBeenCalledTimes(1);
    const [payload, key] = mutationFn.mock.calls[0];
    expect(payload).toEqual({ amount: '500.00' });
    expect(key).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('preserves the EXACT same Idempotency-Key and payload when retrying an uncertain result', async () => {
    let callCount = 0;
    const mutationFn = vi.fn().mockImplementation(async (_payload, _key) => {
      callCount++;
      if (callCount === 1) {
        throw new ApiError('Request timed out', 0, 'TIMEOUT');
      }
      return { id: '1', success: true };
    });

    const { result } = renderHook(() =>
      useIdempotentMutation({ mutationFn })
    );

    // Initial submission fails with timeout
    await act(async () => {
      try {
        await result.current.mutate({ invoiceId: '101', amount: '1500.00' });
      } catch {
        // Expected
      }
    });

    expect(result.current.isUncertain).toBe(true);
    const initialKey = result.current.idempotencyKey;
    expect(initialKey).toBeTruthy();

    // Retry the uncertain submission
    await act(async () => {
      await result.current.retryLastUncertainSubmission();
    });

    expect(mutationFn).toHaveBeenCalledTimes(2);
    const [payload1, key1] = mutationFn.mock.calls[0];
    const [payload2, key2] = mutationFn.mock.calls[1];

    expect(payload1).toEqual(payload2);
    expect(key1).toBe(key2); // Exact same key reused!
    expect(result.current.isUncertain).toBe(false);
  });

  it('generates a NEW Idempotency-Key if the user modifies the payload', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useIdempotentMutation({ mutationFn })
    );

    await act(async () => {
      await result.current.mutate({ amount: '100.00' });
    });
    const key1 = mutationFn.mock.calls[0][1];

    await act(async () => {
      await result.current.mutate({ amount: '200.00' });
    });
    const key2 = mutationFn.mock.calls[1][1];

    expect(key1).not.toBe(key2);
  });

  it('detects 409 STALE_VERSION conflict and sets isConflict', async () => {
    const mutationFn = vi.fn().mockRejectedValue(
      new ApiError('Record modified by another user', 409, 'STALE_VERSION', [], 2)
    );

    const { result } = renderHook(() =>
      useIdempotentMutation({ mutationFn })
    );

    await act(async () => {
      try {
        await result.current.mutate({ expectedVersion: 1, name: 'Shop' });
      } catch {
        // Expected
      }
    });

    expect(result.current.isConflict).toBe(true);
    expect(result.current.error?.status).toBe(409);
    expect(result.current.error?.code).toBe('STALE_VERSION');
  });
});
