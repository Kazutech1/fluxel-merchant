# Dashboard access to `/v1` — what the console does today, and the backend change that fixes it

_Written for the Fluxel-System backend team. Findings come from testing against the sandbox API (`https://apy.wiyuapp.com`) on 11 Oct 2026 with a throwaway business ("Console QA Ltd")._

## The problem

The merchant console needs balances, transactions, customers, payment links, payout accounts, refunds, disputes, webhooks, checkout config and reports. All of these live under `/v1`, and `/v1` only accepts merchant API keys (`bearer_auth_middleware` → `tenant_context_middleware`). A dashboard session JWT is refused with `401 key_invalid`.

## What the console does now (the bridge)

`web/app/lib/server/consoleKeys.ts`:

- On first need, the Next.js server mints a **sandbox secret key** for the business through `POST /v1/dashboard/keys`, which does accept the JWT. It mints a sandbox publishable key only when a checkout link is needed.
- The key is stored AES-256-GCM-encrypted in an httpOnly cookie. It's shared in memory by every signed-in user of that business on the server instance, and revoked on sign-out.
- Every `/v1` call goes through `web/app/api/v1/[...path]/route.ts`. That route checks the user's role against Doc 8 §4 (`web/app/lib/permissions.ts`) before forwarding the request.

Why a sandbox key: `TenantCtx` has no environment, and `KeyEnv::Live` only adds the KYB gate in `tenant.rs`. So a test key sees exactly the same data as a live key, and it works before KYB.

**Limits of the bridge:**

1. **It consumes key slots.** `crates/auth/src/repo.rs` caps active keys at 2 per class and environment (Doc 8 §1). The console uses one sandbox secret slot per business, plus one publishable slot once a checkout link exists. After a server restart, or with several server instances, it can use two.
   - A merchant whose integration already uses two sandbox secret keys can't use the dashboard until they revoke one. The console shows a dedicated screen for this, with Revoke buttons.
   - The console's slot also blocks the "create new, then revoke old" rotation that the two-key limit exists for.
2. **The console keys show up in the merchant's key list.** The Developers page hides this server's console key and explains it, but keys minted by other server instances look like ordinary keys.
3. **Keys can leak if nobody signs out.** If every user simply closes the browser, the key stays active until someone signs out or it's revoked.

## The fix: let dashboard sessions call `/v1`

`dashboard_auth_middleware` already verifies the JWT, checks the business status and inserts a `TenantCtx`, which is exactly what the `/v1` handlers extract. None of the `/v1` handlers read the `ApiKey` extension directly; only `tenant.rs` does. So the `/v1` router can be mounted a second time behind the dashboard middleware. A sketch for `api/src/main.rs` (**not compiled**; it mirrors the existing pipeline):

```rust
// Dashboard sessions reach the merchant API under /v1/dashboard/api/*.
// Same handlers as /v1; authorization comes from the JWT + role, not a key.
let dashboard_api = Router::new()
    .nest("/v1/dashboard/api", routes::v1::router())
    .layer(axum::middleware::from_fn(middleware::idempotency::idempotency_middleware))
    .layer(axum::middleware::from_fn(middleware::ratelimit::rate_limit_middleware))
    .layer(axum::middleware::from_fn_with_state(state.clone(), middleware::dashboard_rbac::require_role))
    .layer(axum::middleware::from_fn_with_state(state.clone(), middleware::dashboard_auth::dashboard_auth_middleware));
```

You'd also need:

- **A `dashboard_rbac` middleware.** Doc 8 §7 says route metadata declares the required permission, and middleware checks the role set. The JWT already carries `roles`. The route → permission table the console enforces today is in `web/app/lib/permissions.ts` (`permissionForV1`); port it as-is. Without this, a `read_only` user could call `POST /payouts` directly with their JWT.
- **`dashboard_auth_middleware` should insert the verified claims** (or at least `roles`) as a request extension, so the RBAC layer doesn't verify the JWT twice.
- **Live-key gating has no equivalent for sessions.** Decide whether dashboard sessions of non-`tier_1` businesses may initiate payouts. Today the console only uses sandbox keys, so it inherits "sandbox account" semantics.

Once that's deployed, the console change is small. `v1Request` calls `dashboardRequest('/v1/dashboard/api/...')` instead of minting keys, and `consoleKeys.ts` can be deleted. The publishable key for checkout links still needs a home. The simplest option is a single long-lived publishable key per business, created once and stored server-side by the API, or returned by a `GET /v1/dashboard/checkout-key` endpoint.

## Other backend issues found while testing

| Area | What happens | Suggested fix |
|---|---|---|
| Bank provider | `GET /v1/banks`, `POST /v1/bank-accounts/resolve`, `POST /v1/payout-accounts` and `POST /v1/payouts` all fail. The provider answers *"Your Request Seems to be coming from an unknown source"* (403 → 503 `name enquiry failed`). | Allowlist the sandbox server's egress IP with the provider. Until then, merchants can't add bank accounts or withdraw. The console shows a friendly error and falls back to CBN bank codes for the bank list. |
| Fiat deposit intents | Intents stay `va: null` (no virtual account) for over a minute, so `POST /v1/sandbox/simulate/fiat-deposit` fails with *"intent has no virtual account provisioned yet"*. | Probably related to `dev_msg` "Nomba deposit webhooks silently dropped". Sandbox deposits can't be simulated end to end right now. |
| Live keys | `POST /v1/dashboard/keys {env:"live"}` succeeds for a business with `tier_1: false`. Every call with that key is then refused (*"live keys require KYB verification"*). | Refuse live-key creation until `tier_1`. That's what the OpenAPI description already says happens. |
| Disputes | `POST /v1/disputes` accepts a `transaction_id` that doesn't exist (tested with `txn_doesnotexist` → `201`). | Validate the transaction belongs to the business. |
| Refunds | List and read only. There's no endpoint to start a refund. | The console tells merchants to raise a dispute instead. Add a create endpoint when ready. |
| Disputes | There's no merchant endpoint to respond to or add evidence to a dispute. | The console shows status and resolution only. |
| `/v1/transfers` list | Rows only have `id`, `status`, `amount` and fees: no asset, date or customers. | The console uses `GET /v1/transactions?kind=transfer`, which is complete. Consider aligning the two. |
| Fiat rows | `/v1/transactions` returns fiat deposits and payouts both as `kind: "fiat"`, with no direction field. | The console queries deposits and payouts separately to tell them apart. A `direction` or `fiat_kind` field would help. |
| `GET /v1/webhook-deliveries` | Requires `endpoint_id` (401 without it). The message says "not yet optional". | Fine for now; the console asks per endpoint. |
| OpenAPI | Several list endpoints (`/transactions`, `/deposits`, `/payment-links`, `/refunds`, `/reports/settlement-summary`) are documented as `{message: string}`. | Document the real `{data, next_cursor}` shapes. |
| `GET /v1/dashboard/sessions` | Returns `[]` right after logging in. | Check whether login sessions are recorded. If not, the Security tab can't show the current device. |
| IP allowlist (`PUT /v1/dashboard/keys/{id}/ip-allowlist`) | Accepts any strings with no CIDR validation. The saved list is **never enforced**: no middleware compares the caller's IP with it. The keys list also doesn't return it, so it can't be read back. | Validate CIDRs on write, reject requests from addresses outside a non-empty list (`403 ip_not_allowed`), and add `ip_allowlist` to the key response. |
