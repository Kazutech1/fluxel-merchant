/**
 * `GET /api/customers` → `GET /v1/dashboard/customers`.
 *
 * Read-only. Customers are created by the merchant's own backend against
 * `POST /v1/customers` on the API-key surface, not from the console, so there
 * is no create/update proxy here.
 *
 * The API returns every customer in one array — no cursor, no page size — so
 * this will need revisiting if a merchant's list grows large.
 */

import { dashboardRequest } from '@/app/lib/server/fluxelApi';
import { errorResponse } from '@/app/lib/server/dashboardSession';

import type { DashboardCustomer } from '@/app/types/customers';

export async function GET(): Promise<Response> {
  try {
    return Response.json(await dashboardRequest<DashboardCustomer[]>('/v1/dashboard/customers'));
  } catch (error) {
    return errorResponse(error);
  }
}
