# ShopHub

A complete single-shop e-commerce platform: one shop, one admin, many customers.
It has a customer storefront, an admin dashboard and a REST API on PostgreSQL.

## Overview

Customers browse the catalogue, add products to a cart or wishlist, check out with an online
payment or cash on delivery, track their orders, request returns, write reviews and contact support.
The shop owner manages products, stock, orders, refunds, coupons, homepage content, reviews, support
tickets and store settings from an admin dashboard with sales analytics.

There is no third-party backend service: the API, database schema, authentication and file storage
are all part of this repository.

## Features

**Storefront**

- Home page with banners, categories, featured / trending / best-selling products, offers and testimonials
- Product listing with search, suggestions, category / price / rating / availability filters, sorting and pagination
- Product pages with image gallery, size and colour variants, live stock, delivery check by PIN code and reviews
- Guest cart (kept in the browser, priced by the server) that merges into the account cart on sign-in
- Wishlist, coupons, saved addresses and a three-step checkout (address → summary → payment)
- Online payment (UPI, cards, net banking, wallets through Razorpay) and cash on delivery
- Orders, order details, tracking timeline, invoice PDF, cancellation and return requests
- Notifications, product reviews with photos, support tickets, profile and password management
- About, contact, offers and four policy pages, all editable from the admin

**Admin** (`/admin`)

- Dashboard and analytics: revenue, orders, customers, top products, category sales, payment methods, refunds
- Products with images and variants, categories and subcategories, inventory with a full stock history
- Order processing (confirm → process → pack → ship → out for delivery → delivered) with courier tracking
- Customers, payments, refunds and returns, coupons, review moderation, support replies
- Homepage banners, sections and merchandising, testimonials, content pages, announcements to all customers
- Store, shipping-zone, tax, payment and notification settings, and an audit log of admin actions

**Platform**

- Prices, discounts, coupons, tax and shipping are always calculated on the server
- Stock reservation with atomic updates; unpaid online orders expire and release their stock
- Payments verified on the server by gateway signature and amount, with idempotent webhooks
- Short-lived JWT access tokens plus revocable refresh sessions in an httpOnly cookie; role-based access control
- Request validation, rate limiting, security headers, upload validation and centralised error handling

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Zustand, Framer Motion, Recharts |
| Backend | Node.js, Express 5, TypeScript, Zod, JSON Web Tokens, bcrypt, Multer, PDFKit, Nodemailer |
| Database | PostgreSQL with Prisma (schema, migrations, seed) |
| Payments | Razorpay (UPI, cards, net banking, wallets), cash on delivery, built-in test gateway |
| Storage | Local disk or Cloudinary |
| Tooling | npm workspaces, ESLint, Playwright (browser tests) |

PostgreSQL was chosen because orders, payments, stock and refunds are relational data that must
stay consistent: the checkout relies on transactions, row locks and foreign keys.

## Architecture

```
Browser (React SPA)
   │  src/services → src/api/client.ts
   ▼
REST API  /api/v1          Express: routes → controllers → validators → services
   ▼
Service layer              business rules, transactions, payment gateway, storage, email
   ▼
PostgreSQL                 through Prisma
```

Every response uses one envelope:

```json
{ "success": true,  "message": "Order placed", "data": { } }
{ "success": false, "message": "email: Enter a valid email address", "error": { "code": "VALIDATION_ERROR", "fields": { "email": "Enter a valid email address" } } }
```

More detail: [docs/architecture.md](docs/architecture.md).

## Folder Structure

```
project/
├── frontend/                 React storefront and admin dashboard
│   ├── src/
│   │   ├── api/              HTTP client and query client
│   │   ├── services/         one function per API endpoint (the only place that calls the API)
│   │   ├── pages/            one file per route: store/ and admin/
│   │   ├── sections/         page-specific building blocks
│   │   ├── components/       reusable UI: ui/, product/, cart/, order/, admin/, …
│   │   ├── layouts/          storefront, account and admin shells
│   │   ├── routes/           route tables
│   │   ├── hooks/            data and behaviour hooks
│   │   ├── store/            client state (auth, guest cart, checkout, toasts)
│   │   ├── utils/  types/  constants/  styles/
│   └── tests/e2e/            browser tests
├── backend/                  REST API
│   ├── src/
│   │   ├── routes/           URL → controller
│   │   ├── controllers/      HTTP in, HTTP out
│   │   ├── validators/       request schemas
│   │   ├── services/         business logic
│   │   ├── middleware/       auth, errors, rate limits, uploads, request log
│   │   ├── config/  constants/  database/  emails/  types/  utils/
│   │   ├── app.ts            Express app
│   │   └── server.ts         process entry point
│   ├── prisma/               schema (data models), migrations, seed
│   ├── scripts/              environment and database setup
│   ├── tests/                API tests and the shared test stack
│   └── uploads/              locally stored images (git-ignored)
├── docs/                     architecture, database, API, development, deployment
├── eslint.config.mjs
├── package.json              workspace scripts
└── README.md
```

## Installation

Requires Node.js 20 or newer. Nothing else: a PostgreSQL server ships with the dev dependencies.

```bash
npm install
npm run setup     # creates backend/.env with generated secrets, runs migrations, seeds demo data
npm run dev       # database + API (http://localhost:4000) + storefront (http://localhost:5173)
```

`npm run setup` is safe to re-run: it never overwrites `backend/.env` and skips seeding when the
database already has data.

| | URL | Sign in with |
|---|---|---|
| Storefront | http://localhost:5173 | `priya@example.com` / `Customer@123` |
| Admin | http://localhost:5173/admin | `admin@shophub.local` / `Admin@12345` |

These are demo accounts created by the seed. Change the admin password before going live.

## Environment Variables

All configuration lives in `backend/.env`; [backend/.env.example](backend/.env.example) lists every
option. The frontend has no secrets and needs no configuration
([frontend/.env.example](frontend/.env.example) documents the one optional setting).

| Variable | Purpose |
|---|---|
| `NODE_ENV`, `PORT` | Runtime mode and API port (default 4000) |
| `CLIENT_URL` | Public URL of the storefront: CORS, links in emails, sitemap |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signs access tokens; at least 32 characters (generated by `npm run setup`) |
| `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS` | Session lifetimes |
| `PAYMENT_GATEWAY` | `mock` (test gateway) or `razorpay` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Required when `PAYMENT_GATEWAY=razorpay` |
| `STORAGE_PROVIDER` | `local` or `cloudinary` |
| `UPLOAD_DIR` | Folder for locally stored images (default `backend/uploads`) |
| `CLOUDINARY_*` | Required when `STORAGE_PROVIDER=cloudinary` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Email delivery; without `SMTP_HOST` emails are written to the log and the `email_logs` table |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Admin account created by the seed |

Never commit `.env` files. They are git-ignored.

## Database Setup

`npm run setup` does all of this for you on first install. The individual commands:

| Command | What it does |
|---|---|
| `npm run db:start` | Start the bundled PostgreSQL (port 5433, data in `backend/.pgdata`) |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Load demo data (skipped when the database already has data) |
| `npm run db:setup` | Migrate, then seed |
| `npm run db:reset` | **Erase everything**, re-apply migrations and re-seed |

To use your own PostgreSQL server, set `DATABASE_URL` in `backend/.env`, skip `db:start` and run
`npm run db:setup`. Schema reference: [docs/database.md](docs/database.md).

## Development

```bash
npm run dev           # database, API (watch mode) and Vite dev server
npm run lint          # ESLint for the whole workspace
npm run typecheck     # TypeScript for backend and frontend
npm test              # API tests (149 checks) against an isolated test database
npm run test:e2e      # builds the frontend, then runs the browser journey (41 steps)
npm run test:responsive   # every page at 9 viewport widths, 360px to 1920px
```

The tests start and stop their own database and API and never touch development data.
The browser tests use an installed Microsoft Edge (Windows) or Google Chrome.
More detail: [docs/development.md](docs/development.md).

## Production Build

```bash
npm run build         # compiles the API to backend/dist and the storefront to frontend/dist
npm run db:migrate    # apply migrations to the production database
npm start             # serves the API and the built storefront from one port
```

Set `NODE_ENV=production`, a real `DATABASE_URL`, `CLIENT_URL` (the public https URL) and a
payment gateway before starting.

## API Documentation

Base URL: `/api/v1`. The main groups:

| Group | Routes |
|---|---|
| Auth | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, password reset |
| Catalogue | `/products`, `/products/:slug`, `/categories`, `/home`, `/offers`, `/content/:slug` |
| Shopping | `/cart`, `/wishlist`, `/addresses`, `/delivery/check` |
| Orders | `/orders`, `/orders/:id`, `/orders/:id/cancel`, `/orders/:id/return`, `/orders/:id/invoice` |
| Payments | `/payments/create`, `/payments/verify`, `/payments/webhook` |
| Engagement | `/reviews`, `/notifications`, `/support/tickets`, `/uploads` |
| Admin | `/admin/dashboard`, `/admin/products`, `/admin/orders`, `/admin/refunds`, `/admin/settings`, … |

Full reference with request and response details: [docs/api.md](docs/api.md).

## Deployment

The simplest deployment is one Node process behind HTTPS: the API serves the built storefront,
`/sitemap.xml` and `/robots.txt`, with a managed PostgreSQL database.
Step-by-step instructions and the go-live checklist: [docs/deployment.md](docs/deployment.md).

## Known limits

- The Razorpay integration is implemented but has only been exercised through the built-in test
  gateway, which uses the same signature, verification and webhook flow. Run it in Razorpay test
  mode before taking real payments.
- Email delivery over SMTP has not been tested against a real mail server.
- Phone / OTP login and Google login are not included; sign-in is by email and password.
- SMS, WhatsApp and push notifications are not connected; notifications are in-app and email.
- Image storage supports local disk and Cloudinary. S3 is not implemented.
- The storefront is a client-rendered SPA. Page titles, descriptions, canonical URLs, Open Graph tags
  and product structured data are set in the browser, so crawlers that do not run JavaScript will
  not see them.
- Demo product images are hot-linked from Pexels; replace them with your own uploads.
#   e c o m m e r c e  
 