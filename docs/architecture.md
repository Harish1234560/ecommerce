# Architecture

ShopHub is an npm-workspaces monorepo with two packages: `frontend` (React SPA) and `backend`
(Express REST API). They talk only over HTTP.

```
Frontend (React)  →  REST API (/api/v1)  →  Service layer  →  PostgreSQL (Prisma)
```

## Backend

A request passes through these layers, each with one job:

| Layer | Folder | Responsibility |
|---|---|---|
| Routes | `src/routes` | Map a URL and method to a controller; attach auth, rate-limit and upload middleware |
| Controllers | `src/controllers` | Read the request, call a validator and a service, send the response envelope |
| Validators | `src/validators` | Zod schemas for body, query and params; reject bad input with per-field messages |
| Services | `src/services` | All business rules and database access; no knowledge of HTTP |
| Data models | `prisma/schema.prisma` | Tables, relations, enums and indexes; `src/database/prisma.ts` is the client |

Supporting folders: `src/middleware` (auth, error handler, rate limits, uploads, request log),
`src/config` (validated environment), `src/constants`, `src/utils` (errors, response helpers,
logger, slugs, crypto), `src/emails` (templates) and `src/types`.

`src/app.ts` builds the Express app; `src/server.ts` connects to the database, starts listening
and starts the background jobs.

### Responses and errors

Controllers respond through `utils/response.ts`, so every success looks the same:

```json
{ "success": true, "message": "Success", "data": { }, "meta": { "page": 1, "pages": 4, "total": 37, "limit": 10 } }
```

`meta` is present on paginated lists. Services throw `ApiError(status, message, fields?, code?)`.
The error handler in `middleware/error.ts` turns it, Zod errors and Prisma errors into:

```json
{ "success": false, "message": "Only 2 left in stock", "error": { "code": "OUT_OF_STOCK", "fields": { } } }
```

Unexpected errors are logged with their stack trace on the server and answered with a generic
500 message. Stack traces are never sent to the client.

### Authentication and authorisation

- Passwords are hashed with bcrypt.
- Signing in returns a 15-minute JWT access token (kept in memory by the frontend) and sets an opaque
  refresh token in an httpOnly, SameSite=Strict cookie scoped to `/api/v1/auth`. Only the token's
  hash is stored, in the `sessions` table, so sessions can be revoked.
- `GET /auth/session` restores a session on page load; `POST /auth/refresh` issues a new access token.
- Roles are `CUSTOMER` and `ADMIN`. `requireAuth` loads the user from the database on every request,
  so a disabled account stops working immediately. Every `/admin` route also passes `requireAdmin`.

### Money, pricing and stock

- Money is stored as integer paise. The client never sends a price: `pricing.service.ts` prices the
  cart from the database (selling price, coupon, tax, shipping zone) on every read and at checkout.
- Each sellable unit has on-hand, reserved and available stock. Movements are atomic SQL updates and
  every one is recorded in `inventory_transactions`.
- Placing an order runs in one transaction: validate stock and coupon, create the order as `PENDING`,
  reserve stock. Confirmation (payment verified, or the admin confirming a cash-on-delivery order)
  commits the stock. Cancellation or expiry releases it.
- `Idempotency-Key` on `POST /orders` makes a retried request return the original order.

### Payments

`services/payment/gateway.ts` defines the gateway interface with two implementations: Razorpay and
a test gateway that uses the same signature scheme and calls the same webhook.

1. `POST /payments/create` creates a gateway order for the server-calculated amount.
2. The browser completes checkout and posts the gateway's signed response to `POST /payments/verify`.
3. The server verifies the HMAC signature and the amount before confirming the order.
4. `POST /payments/webhook` (raw body, signature verified) confirms the order even if the browser
   was closed. Events are recorded in `webhook_events`, so duplicates are ignored.

Card numbers, CVVs and PINs never reach this application; the gateway collects them.
A refund stays `PROCESSING` until the gateway's webhook confirms it. Cash-on-delivery refunds are
recorded manually with a transaction reference.

### Security

Helmet headers with a content security policy, CORS limited to `CLIENT_URL`, rate limits on the
whole API and stricter ones on credential endpoints, Zod validation on every input, upload type
detected from file bytes with a size limit, parameterised queries throughout, secrets only in
environment variables.

### Background jobs

`services/jobs.service.ts` runs in-process timers: every minute it cancels unpaid online orders
past the payment window and releases their stock; every hour it announces coupons about to expire.
Each job is safe to run repeatedly.

## Frontend

| Folder | Responsibility |
|---|---|
| `src/api` | `client.ts`: fetch wrapper with the bearer token, silent session refresh and one error type. `queryClient.ts`: TanStack Query defaults |
| `src/services` | One function per API endpoint. Components and hooks call these; nothing else calls the API |
| `src/pages` | One component per route (`store/` and `admin/`), lazy-loaded so each is its own chunk |
| `src/sections` | Larger blocks that belong to one page or feature |
| `src/components` | Reusable pieces: `ui/` (buttons, forms, modals, feedback), `product/`, `cart/`, `order/`, `admin/`, … |
| `src/layouts` | Storefront shell (header, footer, mobile menu), account shell, admin shell |
| `src/routes` | Route tables and guards |
| `src/hooks` | Data hooks (cart, wishlist, settings, orders) and behaviour hooks (SEO, payment) |
| `src/store` | Zustand stores for client state: auth, guest cart, checkout, toasts |
| `src/utils`, `src/types`, `src/constants`, `src/styles` | Formatting and validation helpers, shared types, labels, global CSS |

Server state lives in TanStack Query; client state lives in Zustand. Zustand takes the place of
React context, so there is no `context` folder.

A guest's cart is stored in the browser and priced by `POST /cart/quote`; signing in merges it
into the account cart. Each page sets its title, description, canonical URL and Open Graph tags
through `useSeo`; product pages add Product structured data. The API serves `/sitemap.xml` and
`/robots.txt`.

The admin dashboard shares the component library but uses its own colour palette (the `.admin`
class) and is loaded only when an admin route is visited.
