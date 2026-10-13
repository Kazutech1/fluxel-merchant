/**
 * The dashboard business surface: KYB submission and API key creation.
 * Both authenticate with the dashboard session, not a merchant API key.
 */

import type { AuthBusiness } from './auth';

/**
 * KYB payload.
 *
 * `SubmitKybRequest.details` is a bare `serde_json::Value` and the Rust side
 * says "exact fields TBD by compliance", so this shape is chosen here, not
 * dictated by the backend. It is stored verbatim on the business document and
 * no endpoint reads it back, so treat it as write-only until compliance
 * specifies the real schema.
 */
export interface KybDetails {
  legal_name: string;
  trading_name?: string;
  /** CAC registration number. */
  rc_number: string;
  tax_id: string;
  business_type: string;
  registered_address: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  director_name: string;
  director_bvn: string;
}

/** `POST /api/business/kyb` — the API returns only a message, so we re-read the business. */
export interface KybSubmitResult {
  message: string;
  business: AuthBusiness;
}

export type KeyClass = 'publishable' | 'secret';
/** The API's own spelling — note `test`, not `sandbox`. */
export type KeyEnv = 'test' | 'live';

/**
 * One row of `GET /v1/dashboard/keys`, documented as "Active API keys for this
 * business" — revoked keys are filtered out server-side, so there is no status
 * field and a revoked key simply stops appearing.
 */
export interface ApiKeySummary {
  id: string;
  display_prefix: string;
  last4: string;
  env: string;
  key_class: string;
}

/** `POST /v1/dashboard/keys` → 201. `plaintext` is shown once and never again. */
export interface CreatedApiKey {
  id: string;
  display_prefix: string;
  last4: string;
  env: string;
  key_class: string;
  plaintext: string;
}
