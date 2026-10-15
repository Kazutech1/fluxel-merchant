# Dashboard access to `/v1`

_Written for the Fluxel-System backend team. Updated 13 Oct 2026, after testing against the sandbox API (`https://apy.wiyuapp.com`)._

## Status: the console now uses the dashboard JWT

The API accepts the dashboard JWT on `/v1`. On 13 Oct 2026 every `/v1` route the console uses answered a JWT request, reads and writes alike. So the console no longer creates a sandbox secret key for each business:

- Every `/v1` call goes through `web/app/api/v1/[...path]/route.ts` with the signed-in user's JWT (`web/app/lib/server/v1.ts`).
- That route still checks the user's role (Doc 8 §4, `web/app/lib/permissions.ts`) before forwarding, so a page gets a clear 403. The API should enforce the same mapping itself, because a user's JWT can call `/v1` directly.
- Token refresh is shared between concurrent requests (`fluxelApi.ts`). A page fires several calls at once, and the API revokes the session if one refresh token is presented twice.

## Still open: a publishable key for checkout links

Checkout links (`/pay/{intent}?c=…`) carry the merchant's `pk_` key, because shoppers aren't signed in. The API returns a key's plaintext only when it's created, and there's no endpoint that returns it later. So the console creates one sandbox publishable key the first time a link needs it, and remembers it (`web/app/lib/server/checkoutKey.ts`).

- It's kept in server memory and in a cookie bound to the business. A new browser or a server restart with no cookie creates another key, which uses up the two-key limit.
- It's never revoked on sign-out, because links already sent use it.

**Ask:** a `GET /v1/dashboard/checkout-key` that returns one long-lived publishable key per business, creating it on first call. Publishable keys are read-only and public by design, so returning the plaintext is safe.

**Keys left over:** businesses that used the console before this change may still have an active sandbox secret key that the console created. They show up in Developers → API keys and can be revoked there.

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




kaztech069@gmail.com




brown depth nut oven chest dove diary wage deputy arch brand find