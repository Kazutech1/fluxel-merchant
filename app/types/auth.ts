/**
 * Shapes shared by the auth route handlers and the client.
 *
 * Every field here mirrors something the Rust API actually returns — see
 * `Fluxel-System/api/src/routes/dashboard/mod.rs`. Nothing is invented on the
 * frontend: if a value isn't in this file, the backend doesn't expose it yet.
 */

/** `businesses::BusinessStatus`, snake_cased on the wire by `get_business`. */
export type BusinessStatus = 'pending_kyb' | 'kyb_pending' | 'active' | 'frozen' | 'rejected';

export type SettlementPreference = 'accumulate' | 'auto_transfer';

export interface AuthUser {
  /** `usr_…` ULID — the JWT's `sub`. */
  id: string;
  email: string;
  /** From the JWT's `roles`. Self-registration mints `['owner']`. */
  roles: string[];
}

export interface AuthBusiness {
  /** `biz_…` ULID — the JWT's `biz`. */
  id: string;
  name: string;
  status: BusinessStatus;
  /**
   * The sandbox/production gate, independent of `status`: false until an admin
   * approves KYB. Live-env API keys are refused at use time while it is false.
   */
  tier_1: boolean;
  settlement_preference: SettlementPreference;
}

export interface AuthSession {
  user: AuthUser;
  business: AuthBusiness;
}

/** `GET /api/auth/session`. */
export type SessionResponse = { authenticated: false } | ({ authenticated: true } & AuthSession);

/** The API's error envelope (`api/src/routes/error_map.rs::envelope`). */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
