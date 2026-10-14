# Deployment

ShopHub deploys as one Node.js process plus a PostgreSQL database. The API serves the built
storefront, so the browser talks to a single origin.

## Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer (a managed service is recommended)
- HTTPS in front of the app (a platform's built-in TLS, or a reverse proxy such as Nginx or Caddy)
- Persistent storage for uploaded images, or Cloudinary

The PostgreSQL bundled for development is a dev dependency. Do not use it in production.

## Steps

```bash
npm ci --include=dev   # the build needs the dev dependencies (TypeScript, Vite, Prisma CLI)
npm run build          # backend → backend/dist, storefront → frontend/dist
npm run db:migrate     # apply migrations to the production database
npm start              # start the server on PORT
```

Run `npm run db:seed` once on a new database if you want the demo catalogue and the admin account
from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. On an empty database it is also the way the first
admin account is created.

## Environment

Set these on the server (see `backend/.env.example` for the full list):

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | The port your platform expects |
| `CLIENT_URL` | The public URL, for example `https://shop.example.com` |
| `DATABASE_URL` | Your PostgreSQL connection string |
| `JWT_SECRET` | A random string of at least 32 characters, unique to this deployment |
| `PAYMENT_GATEWAY` | `razorpay`, with `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| `STORAGE_PROVIDER` | `cloudinary` with the `CLOUDINARY_*` keys, or `local` with `UPLOAD_DIR` on a persistent disk |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Your mail provider |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Your admin login, set before seeding |

In production the refresh cookie is `Secure`, so sign-in only works over HTTPS. The app trusts one
proxy hop (`X-Forwarded-*`) for client IPs and rate limiting.

## Razorpay

1. Create API keys in the Razorpay dashboard and set the three `RAZORPAY_*` variables.
2. Add a webhook pointing to `https://<your-domain>/api/v1/payments/webhook` with the same secret
   as `RAZORPAY_WEBHOOK_SECRET` and these events: `payment.captured`, `payment.failed`, `order.paid`,
   `refund.processed`, `refund.failed`.
3. Place a test order with Razorpay test keys before switching to live keys.

The Razorpay path has been exercised only through the built-in test gateway, which uses the same
signature, verification and webhook flow. Test it in Razorpay test mode before taking real payments.

## Images

- `STORAGE_PROVIDER=local` writes to `UPLOAD_DIR` (default `backend/uploads`) and serves files at
  `/uploads`. On platforms with an ephemeral filesystem, point `UPLOAD_DIR` at a mounted volume or
  the images disappear on redeploy.
- `STORAGE_PROVIDER=cloudinary` uploads to Cloudinary and stores the returned URL.

## Reverse proxy

If you put Nginx or similar in front, forward everything to the Node process and pass the original
protocol and client address:

```nginx
location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    client_max_body_size 25m;
}
```

## Running more than one instance

The app is stateless apart from two things: locally stored uploads (use Cloudinary or a shared
volume) and the in-process background jobs. The jobs are safe to run on several instances, but rate
limits are counted per instance.

## Go-live checklist

- [ ] `NODE_ENV=production`, HTTPS working, `CLIENT_URL` set to the public URL
- [ ] `JWT_SECRET` is a fresh random value
- [ ] Admin password changed from the seed default
- [ ] `PAYMENT_GATEWAY=razorpay`, webhook added, a test payment and a test refund completed
- [ ] SMTP configured and a test email (for example a password reset) received
- [ ] Uploads on persistent storage or Cloudinary
- [ ] Database backups enabled
- [ ] Store details, shipping zones, tax rules and policy pages filled in from the admin settings
- [ ] Demo products, customers and orders removed or replaced

## Updating

```bash
git pull
npm ci --include=dev
npm run build
npm run db:migrate
# restart the process
```

Migrations are forward-only. Back up the database before applying them.

## Search engines

The storefront is a client-rendered single-page app. The server provides `/sitemap.xml` and
`/robots.txt`; page titles, descriptions, canonical URLs, Open Graph tags and product structured
data are set in the browser. Google renders JavaScript and will read them; crawlers that do not run
JavaScript will not. Add prerendering if that matters for your traffic.
