import { ApiError, ErrorResponse } from '../types/api.types';
import apiClient from './client';

/**
 * Generate a client-side UUID v4 for Idempotency-Key headers.
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 compliant UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Safely parse an unknown error into a normalized ApiError.
 */
export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof Error) {
    return new ApiError(error.message, 500, 'UNEXPECTED_CLIENT_ERROR');
  }
  return new ApiError('An unexpected error occurred.', 500, 'UNKNOWN');
}

/**
 * Helper to download PDF documents with proper Bearer authentication,
 * error handling (extracting JSON error from Blob if request failed),
 * and clean browser trigger.
 */
export async function downloadPdfDocument(
  url: string,
  filename: string,
  signal?: AbortSignal
): Promise<void> {
  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
      headers: {
        Accept: 'application/pdf',
      },
      signal,
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err: unknown) {
    // If the error response is a blob containing JSON error details
    const axiosErr = err as { response?: { data?: Blob; status?: number } };
    if (axiosErr.response?.data instanceof Blob && axiosErr.response.data.type.includes('json')) {
      try {
        const text = await axiosErr.response.data.text();
        const json: ErrorResponse = JSON.parse(text);
        throw new ApiError(
          json.error.message || 'Failed to download PDF',
          axiosErr.response.status || 500,
          json.error.code,
          json.error.fields,
          json.error.currentVersion,
          json.requestId
        );
      } catch (parseErr) {
        if (parseErr instanceof ApiError) throw parseErr;
      }
    }
    throw parseApiError(err);
  }
}
