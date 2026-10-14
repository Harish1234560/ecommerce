# API Reference

Base URL: `/api/v1` (for example `http://localhost:4000/api/v1`). JSON in, JSON out.

## Conventions

**Success**

```json
{ "success": true, "message": "Success", "data": { } }
```

Paginated lists add `meta`: `{ "total": 37, "page": 1, "limit": 12, "pages": 4 }` (some lists add
counters such as `statusCounts` or `unreadCount`).

**Error**

```json
{ "success": false, "message": "email: Enter a valid email address", "error": { "code": "VALIDATION_ERROR", "fields": { "email": "Enter a valid email address" } } }
```

| Status | Meaning |
|---|---|
| 400 | Validation failed (`error.fields` has one message per field) or the request is not allowed in the current state |
| 401 | Not signed in, or the access token expired |
| 402 | Payment was declined |
| 403 | Signed in but not allowed (not an admin, or the account is disabled) |
| 404 | Not found |
| 409 | Conflict: duplicate value, out of stock, price changed |
| 429 | Rate limit reached |
| 500 | Unexpected server error |

`error.code` is a stable string the client can branch on, for example `VALIDATION_ERROR`,
`OUT_OF_STOCK`, `INSUFFICIENT_STOCK`, `COUPON_INVALID`, `INVALID_SIGNATURE`, `NOT_RETURNABLE`,
`RATE_LIMITED`, `ROUTE_NOT_FOUND`.

**Authentication.** Send the access token as `Authorization: Bearer <token>`. The refresh token is
an httpOnly cookie set by the server; the browser sends it only to `/api/v1/auth`.

**Money** is in paise (integer). ₹499 is `49900`. Price filters on the product list are the one
exception and take rupees.

Access levels below: **Public** needs no token, **Customer** needs any signed-in user,
**Admin** needs a user with role `ADMIN`.

## Health

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/health` | Public | Liveness check |

## Auth

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create a customer account. Body: `name`, `email`, `password`, optional `phone`. Returns `user` and `accessToken`, sets the refresh cookie |
| POST | `/auth/login` | Public | Body: `email`, `password`. Returns `user` and `accessToken`, sets the refresh cookie |
| GET | `/auth/session` | Public | Restore the session from the refresh cookie. `data` is `null` for a visitor who is not signed in |
| POST | `/auth/refresh` | Public | New access token from the refresh cookie |
| POST | `/auth/logout` | Public | Revoke the session and clear the cookie |
| POST | `/auth/forgot-password` | Public | Body: `email`. Always answers success, so it does not reveal which emails exist |
| POST | `/auth/reset-password` | Public | Body: `token`, `password` |
| GET | `/auth/me` | Customer | The signed-in user |
| PATCH | `/auth/profile` | Customer | Body: any of `name`, `phone`, `avatarUrl` |
| POST | `/auth/change-password` | Customer | Body: `currentPassword`, `newPassword` |

Passwords need at least 8 characters with a letter and a number. Register, login and password-reset
endpoints have a stricter rate limit.

## Catalogue and content

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/home` | Public | Everything the home page shows: banners, sections, categories, product rows, testimonials |
| GET | `/products` | Public | Product list. Query: `q`, `category`, `subcategory`, `brand` (comma-separated), `minPrice`, `maxPrice` (rupees), `rating`, `discount`, `inStock`, `featured`, `trending`, `bestseller`, `sort` (`popularity`, `newest`, `price_asc`, `price_desc`, `rating`, `discount`), `page`, `limit` (max 48). `meta` includes the brands and price range available for the filters |
| GET | `/products/suggest` | Public | Search suggestions. Query: `q` (2+ characters) |
| GET | `/products/:slug` | Public | Product detail with images, variants, stock, related products |
| GET | `/products/:slug/reviews` | Public | Approved reviews. Query: `page`, `limit`, `rating` |
| GET | `/categories` | Public | Categories with subcategories |
| GET | `/categories/:slug` | Public | One category |
| GET | `/offers` | Public | Active coupons and discounted products |
| GET | `/content/:slug` | Public | A content page: `about`, `privacy`, `terms`, `return-policy`, `shipping-policy` |
| GET | `/settings/public` | Public | Store name, contact details, social links, policies shown in the storefront |
| GET | `/delivery/check` | Public | Query: `pincode`. Whether delivery and cash on delivery are available, the fee and the estimated dates |
| POST | `/newsletter` | Public | Body: `email` |

## Cart

All cart responses return the whole cart, freshly priced: items, totals, coupon, delivery fee, tax
and any problems (out of stock, price changed).

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/cart/quote` | Public | Price a guest cart. Body: `items` (`productId`, optional `variantId`, `quantity`), optional `couponCode`, `pincode` |
| GET | `/cart` | Customer | The account cart. Optional query `pincode` prices delivery for that address |
| DELETE | `/cart` | Customer | Empty the cart |
| POST | `/cart/items` | Customer | Add a line. Body: `productId`, optional `variantId`, `quantity` |
| PATCH | `/cart/items/:id` | Customer | Body: `quantity` and/or `savedForLater` |
| DELETE | `/cart/items/:id` | Customer | Remove a line |
| POST | `/cart/coupon` | Customer | Body: `code` |
| DELETE | `/cart/coupon` | Customer | Remove the coupon |
| POST | `/cart/merge` | Customer | Fold a guest cart into the account cart after sign-in. Body: `items` |

## Wishlist

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/wishlist` | Customer | Wishlist with product details |
| GET | `/wishlist/ids` | Customer | Just the product ids (for heart icons) |
| POST | `/wishlist` | Customer | Body: `productId` |
| DELETE | `/wishlist/:productId` | Customer | Remove |
| POST | `/wishlist/:productId/move-to-cart` | Customer | Add to cart and remove from the wishlist |

## Addresses

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/addresses` | Customer | Saved addresses |
| POST | `/addresses` | Customer | Create |
| PUT | `/addresses/:id` | Customer | Update |
| PATCH | `/addresses/:id/default` | Customer | Make default |
| DELETE | `/addresses/:id` | Customer | Delete |

## Orders

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/orders` | Customer | Place an order from the cart. Body: `addressId`, `paymentMethod` (`COD` or `ONLINE`), optional `notes`. Send an `Idempotency-Key` header: a retry with the same key returns the same order |
| GET | `/orders` | Customer | My orders. Query: `status`, `page`, `limit` |
| GET | `/orders/:id` | Customer | Order detail with items, timeline, payment and refunds |
| POST | `/orders/:id/cancel` | Customer | Body: `reason`. Allowed until the order ships |
| POST | `/orders/:id/return` | Customer | Body: `reason`, optional `items` (`orderItemId`, `quantity`). Allowed within the return window after delivery |
| GET | `/orders/:id/invoice` | Customer | Invoice PDF |

The server recalculates every price when the order is placed. If stock ran out or a price changed
since the cart was last loaded, the request fails with 409 and the cart shows what changed.

## Payments

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/payments/config` | Public | Which gateway and methods are enabled |
| POST | `/payments/create` | Customer | Start paying for an order. Body: `orderId`, optional `method` (`upi`, `card`, `netbanking`, `wallet`). Returns the gateway order id, amount and public key |
| POST | `/payments/verify` | Customer | Body: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`. The server checks the signature and amount, then confirms the order |
| POST | `/payments/webhook` | Gateway | Called by the payment gateway. Authenticated by the signature header over the raw body, not by a user token |
| POST | `/mock-gateway/pay` | Customer | Test gateway only (`PAYMENT_GATEWAY=mock`): simulate a successful or failed payment |

An order is marked paid only by `/payments/verify` or the webhook, never by the browser alone.

## Reviews, notifications, support, uploads

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/reviews/mine` | Customer | My reviews and delivered products still waiting for one |
| POST | `/reviews` | Customer | Body: `productId`, `rating` (1–5), `comment`, optional `title`, `images` (up to 4 uploaded URLs) |
| PUT | `/reviews/:id` | Customer | Edit my review |
| DELETE | `/reviews/:id` | Customer | Delete my review |
| GET | `/notifications` | Customer | Query: `page`, `limit`, `unread` |
| GET | `/notifications/unread-count` | Customer | Badge count |
| POST | `/notifications/read-all` | Customer | Mark all read |
| PATCH | `/notifications/:id/read` | Customer | Mark one read |
| DELETE | `/notifications/:id` | Customer | Delete |
| POST | `/support/tickets` | Public | Contact form. Body: `name`, `email`, `subject`, `message`, optional `phone`, `orderId`. Linked to the account when signed in |
| GET | `/support/tickets` | Customer | My tickets |
| GET | `/support/tickets/:id` | Customer | Ticket with messages |
| POST | `/support/tickets/:id/messages` | Customer | Body: `message` |
| POST | `/uploads` | Customer | Multipart form, field `files`. JPEG, PNG, WebP or GIF up to 5 MB each; the type is detected from the file contents. Returns `urls` |

## Admin

Every route below is under `/admin` and requires the `ADMIN` role.

| Area | Routes |
|---|---|
| Dashboard | `GET /dashboard`, `GET /analytics`. Query: `range` (`today`, `7d`, `30d`, `year`, `custom`) with `from` and `to` for custom |
| Products | `GET /products`, `POST /products`, `GET /products/:id`, `PUT /products/:id`, `PATCH /products/:id` (status and merchandising flags), `DELETE /products/:id`, `POST /products/bulk` (`ids`, `action`) |
| Categories | `GET /categories`, `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id`, `POST /categories/:id/subcategories`, `PUT /categories/subcategories/:subId`, `DELETE /categories/subcategories/:subId` |
| Inventory | `GET /inventory` (`filter`: `all`, `low`, `out`), `POST /inventory/:id/adjust` (`mode`: `increase`, `decrease`, `set`; `quantity`; `note`), `PATCH /inventory/:id` (`lowStockThreshold`), `GET /inventory/:id/history` |
| Orders | `GET /orders`, `GET /orders/:id`, `POST /orders/:id/status` (`status`, optional `note`, `courier`, `trackingNumber`), `GET /orders/:id/invoice` |
| Customers | `GET /customers`, `GET /customers/:id`, `PATCH /customers/:id` (`isActive`) |
| Payments | `GET /payments` |
| Refunds | `GET /refunds`, `POST /refunds/:id/approve`, `POST /refunds/:id/reject` (`note`), `POST /refunds/:id/received`, `POST /refunds/:id/process` (optional `reference` for a manual refund) |
| Coupons | `GET /coupons`, `POST /coupons`, `PUT /coupons/:id`, `PATCH /coupons/:id` (`isActive`), `DELETE /coupons/:id` |
| Reviews | `GET /reviews`, `PATCH /reviews/:id` (`status`), `DELETE /reviews/:id` |
| Support | `GET /support`, `GET /support/:id`, `POST /support/:id/messages`, `PATCH /support/:id` (`status`) |
| Notifications | `POST /notifications/broadcast` (`title`, `message`, optional `type` `OFFER` or `SYSTEM`, optional `link` to a page on this site): in-app notification to every active customer |
| Content | `GET /content`, banners (`POST /content/banners`, `PUT` and `DELETE /content/banners/:id`), `PUT /content/sections/:id`, testimonials (`POST /content/testimonials`, `PUT` and `DELETE /content/testimonials/:id`), `PUT /content/pages/:slug` |
| Settings | `GET /settings`, `PUT /settings/:key`, shipping zones (`POST /settings/shipping-zones`, `PUT` and `DELETE /settings/shipping-zones/:id`), tax rules (`POST /settings/tax-rules`, `PUT` and `DELETE /settings/tax-rules/:id`), `GET /settings/audit-logs` |

Order status changes follow a fixed sequence (confirm → process → pack → ship → out for delivery →
delivered); the order detail response lists the statuses allowed next. A refund through the gateway
is reported as completed only after the gateway's webhook confirms it.

## Outside `/api/v1`

| Path | Description |
|---|---|
| `/uploads/<file>` | Locally stored images |
| `/sitemap.xml`, `/robots.txt` | Generated for search engines |
