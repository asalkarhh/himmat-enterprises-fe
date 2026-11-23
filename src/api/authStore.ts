/**
 * In-Memory Token & Session Store.
 *
 * CRITICAL SECURITY REQUIREMENT:
 * - Access token is kept strictly in-memory (closure/variable).
 * - NEVER stored in localStorage, sessionStorage, IndexedDB, cookies, or URLs.
 * - Tab/page reload terminates session cleanly without silent persistence.
 */

let inMemoryAccessToken: string | null = null;
type AuthEventListener = () => void;
const unauthorizedListeners = new Set<AuthEventListener>();

export const authStore = {
  getToken: (): string | null => inMemoryAccessToken,

  setToken: (token: string | null): void => {
    inMemoryAccessToken = token;
  },

  clearToken: (): void => {
    inMemoryAccessToken = null;
  },

  hasToken: (): boolean => !!inMemoryAccessToken,

  /**
   * Subscribe to 401 unauthorized session expiration events.
   * Ensures session is expired once without looping.
   */
  onUnauthorized: (listener: AuthEventListener): (() => void) => {
    unauthorizedListeners.add(listener);
    return () => {
      unauthorizedListeners.delete(listener);
    };
  },

  notifyUnauthorized: (): void => {
    inMemoryAccessToken = null;
    unauthorizedListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in unauthorized listener', err);
      }
    });
  },
};
