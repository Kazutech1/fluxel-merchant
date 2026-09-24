/**
 * Customers, as `GET /v1/dashboard/customers` returns them.
 *
 * Three fields, and that is the whole record — `customers::Customer` is
 * `{id, external_id, status}`. There is no name, email, balance, KYC tier or
 * risk score on the API side; `POST /v1/customers` accepts `name`/`email`/
 * `metadata` but discards them.
 */

export type CustomerStatus = 'active' | 'frozen';

export interface DashboardCustomer {
  id: string;
  external_id: string;
  status: CustomerStatus;
}
