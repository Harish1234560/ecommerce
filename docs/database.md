# Database

PostgreSQL, accessed through Prisma. The schema is `backend/prisma/schema.prisma`; migrations are in
`backend/prisma/migrations`; demo data comes from `backend/prisma/seed.ts`.

## Conventions

- Table and column names are snake_case in the database and camelCase in code.
- Primary keys are `cuid` strings. Every table has `created_at` and `updated_at`.
- Money is an integer number of paise (₹1 = 100). There are no floating-point amounts.
- Foreign keys are enforced. Child rows that have no meaning without their parent
  (order items, cart items, images, messages) are deleted with it; an order keeps a snapshot of the
  product name, SKU, price and address, so later catalogue edits never change past orders.
- Uniqueness is enforced in the database: emails, SKUs, slugs, coupon codes, order and invoice
  numbers, gateway payment ids, and one webhook event per gateway event id.
- Columns used for filtering and sorting are indexed (for example orders by user and date, by status
  and date; products by category, status, price, sales and rating).

## Tables

### Accounts

| Table | Purpose |
|---|---|
| `users` | Customers and the admin. `role` is `CUSTOMER` or `ADMIN`; `password_hash` is bcrypt; `is_active` disables an account |
| `sessions` | Refresh sessions: token hash, expiry, user agent and IP. Deleting a row signs that device out |
| `password_reset_tokens` | Hashed, single-use, expiring reset tokens |
| `addresses` | Saved delivery addresses, one marked default |

### Catalogue

| Table | Purpose |
|---|---|
| `categories`, `subcategories` | Two-level catalogue tree with slugs, images and sort order |
| `products` | Name, slug, SKU, description, specifications, brand, tags, MRP and discount price, optional tax override, dimensions, status (`DRAFT`, `ACTIVE`, `INACTIVE`), merchandising flags, rating and sales counters. Deleting a product is a soft delete (`deleted_at`) so past orders keep their reference |
| `product_images` | Ordered image gallery |
| `product_variants` | Size / colour combinations with their own SKU and optional price |
| `inventory` | One row per sellable unit (product or variant): on hand, reserved, low-stock threshold |
| `inventory_transactions` | Every stock movement: `RESTOCK`, `ADJUSTMENT`, `RESERVE`, `RELEASE`, `SALE`, `CANCEL`, `RETURN`, with quantity, resulting balance, note, and the order or admin behind it |

### Shopping

| Table | Purpose |
|---|---|
| `carts`, `cart_items` | One cart per customer; items can be saved for later; the applied coupon code |
| `wishlists`, `wishlist_items` | One wishlist per customer |
| `coupons` | Percentage or fixed discount, minimum order, maximum discount, validity window, total and per-user limits, optional restriction to products or categories |
| `coupon_usage` | Which customer used which coupon on which order |

### Orders and money

| Table | Purpose |
|---|---|
| `orders` | Order number, status, payment status and method, all totals (MRP, discount, coupon, shipping, tax, total), address snapshot, idempotency key, courier and tracking number, invoice number |
| `order_items` | Snapshot of each line: name, SKU, image, variant, unit price, quantity, tax, amount paid, quantity returned |
| `order_status_history` | Timeline entries with the actor (customer, admin, system) and a note |
| `payments` | One row per payment attempt: gateway, gateway order and payment ids, method, amount, status, refunded amount, failure reason. Card numbers, CVVs and PINs are never stored |
| `webhook_events` | Gateway events already processed, so a repeated webhook is ignored |
| `refunds` | Cancellation and return refunds: amount, reason, returned items, status, gateway refund id or manual reference |

Order status: `PENDING` → `CONFIRMED` → `PROCESSING` → `PACKED` → `SHIPPED` → `OUT_FOR_DELIVERY` →
`DELIVERED`, with `CANCELLED`, `RETURN_REQUESTED`, `RETURN_APPROVED`, `RETURNED`, `REFUND_PENDING`
and `REFUNDED` as side paths.

Payment status: `PENDING`, `PAID`, `FAILED`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED`.

Refund status: `REQUESTED` → `APPROVED` → `PROCESSING` → `COMPLETED`, or `REJECTED` / `FAILED`.

### Engagement

| Table | Purpose |
|---|---|
| `reviews`, `review_images` | One review per customer per product, linked to the order that verifies the purchase; moderation status |
| `notifications` | In-app notifications by type (order, payment, refund, offer, support, system) |
| `support_tickets`, `support_messages` | Contact-form tickets and their conversation |
| `newsletter_subscribers` | Newsletter sign-ups |

### Content and settings

| Table | Purpose |
|---|---|
| `banners` | Hero and promotional banners with schedule and order |
| `homepage_sections` | Which homepage sections show, their titles and order |
| `testimonials` | Customer quotes on the home page |
| `content_pages` | About and policy pages (Markdown body plus structured data) |
| `store_settings` | Key/value JSON groups: store details, shipping, tax, payment, notifications, social links, policies |
| `shipping_zones` | Delivery fee, free-delivery threshold, cash-on-delivery availability and delivery days by PIN-code prefix |
| `tax_rules` | Named tax rates, default or per category |
| `audit_logs` | Admin actions: who, what, on which record, when |
| `email_logs` | Every email sent or logged |

## Migrations

```bash
npm run db:migrate                     # apply pending migrations (safe for production)
npm run db:migrate:dev -w backend      # create a new migration after editing schema.prisma
```

Never edit a migration that has already been applied. Change `schema.prisma` and create a new one.

## Seed data

`npm run db:seed` creates the admin account, sample customers, categories, 24 products with variants
and stock, coupons, banners, content pages, settings and about 30 orders in different states.
Orders are created through the same services the API uses, so stock, payments and history are
consistent. The seed does nothing when the database already contains users.

## Reset

`npm run db:reset` drops all data, re-applies migrations and re-seeds. It is for development only.

## Test database

`npm test` and the browser tests use a separate database named after the development one with a
`_test` suffix (`shophub_test`). It is created, migrated and seeded automatically.
