/**
 * Centralized configuration for the landing app.
 * Uses VITE_API_URL env var when available (local dev),
 * falls back to production URL.
 */
const meta = import.meta as any;

export const API_BASE_URL: string =
  meta.env?.VITE_API_URL ||
  (meta.env?.DEV ? 'http://localhost:3001/api' : 'https://groomlinkgh.com/api');

export const CUSTOMER_APP_URL = 'https://my.groomlinkgh.com';
export const PARTNERS_APP_URL = 'https://partners.groomlinkgh.com';
