/**
 * Safely downloads a binary blob as a named file in the browser,
 * ensuring Object URL creation, anchor click, and immediate revocation to prevent memory leaks.
 */
export function triggerPdfDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Parses potential JSON error payload when an Axios blob request fails.
 */
export async function parseBlobError(error: unknown): Promise<string> {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as any).response?.data instanceof Blob
  ) {
    try {
      const text = await (error as any).response.data.text();
      const parsed = JSON.parse(text);
      return parsed.error?.message || parsed.message || 'Failed to download document PDF.';
    } catch {
      // Fallback if not valid JSON
    }
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'Failed to download document PDF.';
}
