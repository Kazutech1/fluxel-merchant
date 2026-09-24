/**
 * Server-only configuration for reaching the Fluxel Rust API.
 *
 * Everything under `lib/server/` runs inside route handlers and nowhere else.
 * Two reasons the browser never calls the Rust API directly:
 *
 *   1. It applies no CORS layer. `tower-http`'s `cors` feature is enabled in
 *      Fluxel-System/Cargo.toml but `api/src/main.rs` never adds the layer, so
 *      a cross-origin fetch from the dashboard is rejected by the browser.
 *   2. Refresh tokens live 30 days and rotate single-use. Keeping them in
 *      httpOnly cookies means no page script can read or leak one.
 */

if (typeof window !== 'undefined') {
  throw new Error('lib/server/* is server-only — do not import it from a client component');
}

const RAW = process.env.FLUXEL_API_URL ?? '';

/** Base URL with any trailing slashes stripped, so `${base}${path}` is stable. */
export const FLUXEL_API_URL = RAW.replace(/\/+$/, '');

export function apiUrl(path: string): string {
  if (!FLUXEL_API_URL) {
    throw new Error('FLUXEL_API_URL is not set — copy .env.example to .env.local');
  }
  return `${FLUXEL_API_URL}${path}`;
}

/** Cookies are `Secure` in production only, so http://localhost still works in dev. */
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
