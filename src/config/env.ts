/**
 * Application environment configuration.
 * Safe defaults: no secrets in frontend environment variables.
 */
export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  APP_NAME: 'Himmat Enterprises',
};
