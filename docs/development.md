# Development

## First run

Requires Node.js 20 or newer.

```bash
npm install
npm run setup
npm run dev
```

`npm run setup` creates `backend/.env` from `backend/.env.example` with generated secrets, starts
the bundled PostgreSQL, applies migrations and seeds demo data. It never overwrites an existing
`.env` and skips seeding when the database already has data.

`npm run dev` starts three processes:

| Name | What | Where |
|---|---|---|
| `db` | Bundled PostgreSQL, data in `backend/.pgdata` | port 5433 |
| `api` | Express API in watch mode | http://localhost:4000 |
| `web` | Vite dev server; proxies `/api`, `/uploads`, `/sitemap.xml`, `/robots.txt` to the API | http://localhost:5173 |

Open http://localhost:5173. Demo accounts: `priya@example.com` / `Customer@123` (customer) and
`admin@shophub.local` / `Admin@12345` (admin, at `/admin`).

To use your own PostgreSQL, set `DATABASE_URL` in `backend/.env`, run `npm run db:setup` once and
start only the API and web processes (`npm run dev -w backend`, `npm run dev -w frontend`).

## Scripts

Run from the repository root.

| Script | What it does |
|---|---|
| `npm run setup` | Create `.env`, migrate and seed |
| `npm run dev` | Database, API and frontend in watch mode |
| `npm run build` | Compile the API to `backend/dist` and the storefront to `frontend/dist` |
| `npm start` | Run the compiled API, which also serves the built storefront |
| `npm run lint` / `npm run lint:fix` | ESLint for the whole workspace |
| `npm run typecheck` | TypeScript for backend (source, tests, scripts, seed) and frontend |
| `npm test` | API tests |
| `npm run test:e2e` | Build the frontend and run the browser journey |
| `npm run test:responsive` | Build the frontend and check every page at nine viewport widths |
| `npm run db:start` | Start the bundled PostgreSQL on its own |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo data (skipped when data exists) |
| `npm run db:setup` | Migrate, then seed |
| `npm run db:reset` | Erase the development database, migrate and seed |

Backend-only helpers: `npm run db:migrate:dev -w backend` (create a migration) and
`npm run db:studio -w backend` (browse data in Prisma Studio).

## Tests

All tests run against a separate `shophub_test` database that the test stack creates, migrates
and seeds, with the API on port 4100 and the test payment gateway. They start the database if it is
not already running and stop what they started. Development data is never touched.

**API tests** (`backend/tests/api.e2e.ts`, 149 checks) call the API over HTTP and cover:
registration, login, sessions and role checks; catalogue search and filters; cart pricing, coupons
and stock limits; cash-on-delivery and online checkout; payment verification, forged signatures,
tampered amounts, duplicate webhooks and a payment that completes after the browser closed;
cancellation, returns and refunds; expiry of unpaid orders; admin order processing, inventory,
coupons, content and settings; uploads; support tickets; disabling an account.

**Browser journey** (`frontend/tests/e2e/journey.mjs`, 41 steps) clicks through the built
storefront and admin: register, search, wishlist, variants, cart, coupon, address, three payment
paths (online, cash on delivery, failed then retried), invoice download, tracking, admin product
creation, stock adjustment, order processing to delivery, notifications, review, return request,
refund approval, support ticket, profile edit, sign-out and sign-in, and guest-cart merge. It fails
on any console error, page error or 5xx response.

**Responsive check** (`frontend/tests/e2e/responsive.mjs`) loads every page as a guest, a customer
and the admin at 360, 375, 390, 412, 768, 1024, 1280, 1440 and 1920 pixels and fails on horizontal
overflow, console errors, failed requests or unexpected redirects.

```bash
npm run test:responsive -w frontend -- 360 768        # only these widths (uses the existing build)
E2E_ROLES=admin npm run test:responsive -w frontend   # only one role
E2E_SCREENSHOTS=1 npm run test:responsive             # save screenshots to frontend/test-results
```

The `VAR=value command` form is for bash. In PowerShell set the variable first, for example
`$env:E2E_ROLES = 'admin'`.

The browser tests drive an installed browser through `playwright-core`: Microsoft Edge on Windows,
Google Chrome elsewhere. Set `E2E_BROWSER_CHANNEL` (for example `chrome` or `msedge`) to choose.

## Payments in development

`PAYMENT_GATEWAY=mock` (the default) uses a built-in test gateway. Checkout opens a simulator where
you choose a successful or failed payment. It goes through the same signed checkout response, server
verification and signed webhook as Razorpay, but no money moves.

## Email in development

Without `SMTP_HOST`, emails are not sent. They are written to the API log and the `email_logs`
table. The password-reset link is printed in the API log.

## Adding a feature

Backend, in this order:

1. Schema change in `backend/prisma/schema.prisma`, then `npm run db:migrate:dev -w backend`.
2. Request schema in `src/validators`.
3. Business logic in `src/services`. Throw `ApiError` for expected failures. Use a transaction when
   more than one table changes.
4. Controller in `src/controllers`: validate, call the service, respond with `ok()` or `created()`.
5. Route in `src/routes`, with `requireAuth` or `requireAdmin` as needed.
6. A test in `backend/tests/api.e2e.ts`.

Frontend:

1. Add the endpoint to the matching file in `src/services` and its types to `src/types`.
2. Read data with TanStack Query (`useQuery` / `useMutation`) in a hook or page.
3. Put the route's component in `src/pages`, page-specific blocks in `src/sections`, and anything
   reusable in `src/components`.
4. Handle loading, empty and error states with the components in `components/ui/Feedback`.

## Conventions

- TypeScript strict mode in both packages. `any` is a lint error.
- Components never call `fetch` or the HTTP client directly; they go through `src/services`.
- Money is integer paise everywhere. Format it with `money()` from `utils/format`.
- Prices are never accepted from the client.
- Secrets live only in `backend/.env`. Nothing secret is bundled into the frontend.
