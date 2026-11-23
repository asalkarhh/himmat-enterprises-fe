import { useState, useRef, useCallback } from 'react';
import { generateIdempotencyKey, parseApiError } from '../api/apiHelpers';
import { ApiError } from '../types/api.types';

export interface UseIdempotentMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables, idempotencyKey: string) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: ApiError, variables: TVariables) => void;
}

export interface UseIdempotentMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | undefined>;
  retryLastUncertainSubmission: () => Promise<TData | undefined>;
  isLoading: boolean;
  isConflict: boolean;
  isUncertain: boolean;
  error: ApiError | null;
  data: TData | null;
  idempotencyKey: string | null;
  reset: () => void;
}

/**
 * Reusable Idempotent & Optimistic Locking Mutation Hook.
 *
 * Rules:
 * 1. One key per logical submission.
 * 2. Keep the same key and exact payload when retrying an uncertain result (e.g. timeout / network error).
 * 3. A changed payload is a new logical submission with a new key.
 * 4. Optimistic locking: on conflict (409 STALE_VERSION), surface conflict flag and offer data refresh.
 */
export function useIdempotentMutation<TData, TVariables>({
  mutationFn,
  onSuccess,
  onError,
}: UseIdempotentMutationOptions<TData, TVariables>): UseIdempotentMutationResult<TData, TVariables> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<TData | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [isUncertain, setIsUncertain] = useState(false);

  // Track active key and payload for safe replay
  const currentKeyRef = useRef<string | null>(null);
  const lastPayloadRef = useRef<TVariables | null>(null);
  const lastSerializedPayloadRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
    setIsConflict(false);
    setIsUncertain(false);
    currentKeyRef.current = null;
    lastPayloadRef.current = null;
    lastSerializedPayloadRef.current = null;
  }, []);

  const executeSubmission = useCallback(
    async (variables: TVariables, keyToUse: string): Promise<TData> => {
      setIsLoading(true);
      setError(null);
      setIsConflict(false);
      setIsUncertain(false);

      try {
        const result = await mutationFn(variables, keyToUse);
        setData(result);
        setIsLoading(false);
        setIsUncertain(false);
        // Successful submission consumes key
        currentKeyRef.current = null;
        lastPayloadRef.current = null;
        lastSerializedPayloadRef.current = null;
        onSuccess?.(result, variables);
        return result;
      } catch (rawErr) {
        setIsLoading(false);
        const parsed = parseApiError(rawErr);
        setError(parsed);

        // Check if 409 conflict
        if (parsed.status === 409 || parsed.code === 'STALE_VERSION' || parsed.code === 'CONFLICT') {
          setIsConflict(true);
        }

        // Check if uncertain result (network dropped or timeout after dispatch)
        if (parsed.code === 'TIMEOUT' || parsed.code === 'NETWORK_ERROR' || parsed.status === 0) {
          setIsUncertain(true);
        }

        onError?.(parsed, variables);
        throw parsed;
      }
    },
    [mutationFn, onSuccess, onError]
  );

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | undefined> => {
      const serialized = JSON.stringify(variables);

      // Check if payload changed from a previous pending submission
      if (
        !currentKeyRef.current ||
        lastSerializedPayloadRef.current !== serialized ||
        !isUncertain
      ) {
        // A new logical submission receives a fresh UUID
        currentKeyRef.current = generateIdempotencyKey();
        lastPayloadRef.current = variables;
        lastSerializedPayloadRef.current = serialized;
      }

      return executeSubmission(variables, currentKeyRef.current);
    },
    [executeSubmission, isUncertain]
  );

  const retryLastUncertainSubmission = useCallback(async (): Promise<TData | undefined> => {
    if (!currentKeyRef.current || !lastPayloadRef.current) {
      throw new Error('No pending uncertain submission to retry.');
    }
    // Safe retry uses the EXACT same key and payload
    return executeSubmission(lastPayloadRef.current, currentKeyRef.current);
  }, [executeSubmission]);

  return {
    mutate,
    retryLastUncertainSubmission,
    isLoading,
    isConflict,
    isUncertain,
    error,
    data,
    idempotencyKey: currentKeyRef.current,
    reset,
  };
}
