# ShopSphere — The Product Edit

ShopSphere is a product research workspace for discovering a curated catalog, keeping a wishlist, and comparing products side by side. It is designed to help people make considered choices; it does not sell products or process payments.

> **Catalog:** the seed contains five real India-market smartphones with official manufacturer or store source links. Prices are reference snapshots checked on 2 November 2026, not live offers; confirm current price and availability at the source. Product artwork is illustrative and is not official product photography. The app does not show customer reviews or ratings.

## What’s here

- Responsive editorial discovery page with URL-shareable search, category, price, sorting, and pagination controls.
- Product detail pages with category-specific specifications.
- Official source links and a checked date for reference prices.
- A side-by-side comparison for 2–4 products from one category, with differing specifications highlighted.
- A guest wishlist stored locally; signed-in wishlists and named comparisons stored in PostgreSQL.
- Registration, login, logout, and session-backed current-user retrieval.
- Server-side request validation, password hashing, ownership checks, rate limits, origin checks, and centralized errors.

## Stack and architecture

- **Web:** React, TypeScript, Vite, React Router.
- **API:** Node.js, Express, TypeScript, Zod.
- **Data:** PostgreSQL, Prisma ORM, versioned SQL migration, repeatable seed.
- **Sessions:** opaque `HttpOnly` cookie with a PostgreSQL session store; passwords use Argon2id.

```mermaid
flowchart LR
  Browser[React and TypeScript] -->|JSON over HTTP, session cookie| API[Express REST API]
  API --> Validate[Zod validation and authorization]
  Validate --> Prisma[Prisma ORM]
  Prisma --> DB[(PostgreSQL)]
```

The browser never connects to PostgreSQL. The API owns database access and checks comparison and wishlist ownership on every private request.

## Project layout

```text
apps/
  web/                React application
  api/                Express API and Prisma schema/migrations/seed
packages/             Reserved for shared code if it becomes useful
```

## Local setup

Requirements: Node.js 20.19+ or 22.12+, npm, and Docker Desktop with its engine running (recommended for local development), or a PostgreSQL database you can access. No hosted database is required for local development.

1. Install the workspace dependencies:

   ```sh
   npm install
   ```

2. If `.env` does not already exist, copy `.env.example` to `.env`. Set `DATABASE_URL` to your PostgreSQL connection string, make its username/password match `POSTGRES_USER` and `POSTGRES_PASSWORD` if using Compose, and use a long, random `SESSION_SECRET`. Keep `.env` private; it is ignored by Git.

   Example local URL:

   ```text
   postgresql://postgres:your-local-password@localhost:5432/shopsphere?schema=public
   ```

3. For the included local database, start PostgreSQL in Docker. Compose binds it to localhost only, keeps data in a named volume, and uses credentials from `.env`:

   ```sh
   docker compose up -d db
   ```

   If you already have PostgreSQL running, skip this step and point `DATABASE_URL` at it. Then generate the Prisma client, apply the migration, and seed the demo catalog:

   ```sh
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

   The seed can be repeated safely; it upserts categories and products by unique slug. `docker compose down` stops the local database while preserving its data volume.

4. Start both apps:

   ```sh
   npm run dev
   ```

   - Web: `http://localhost:5173`
   - API health: `http://localhost:4000/api/health`

## Environment variables

| Variable            | Used by | Purpose                                                                                                      |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`      | API     | PostgreSQL connection used by Prisma and the session store.                                                  |
| `SESSION_SECRET`    | API     | Signs the opaque session cookie. Use a long random value; production startup refuses to run without it.      |
| `PORT`              | API     | Host-provided production port; defaults to `API_PORT` (`4000`) locally.                                      |
| `API_PORT`          | API     | Local fallback port (`4000`) used when `PORT` is unset.                                                      |
| `WEB_ORIGIN`        | API     | Exact trusted browser origin for CORS and unsafe-request origin checks; defaults to `http://localhost:5173`. |
| `VITE_API_BASE_URL` | Web     | API URL; defaults to same-origin `/api`. Never put secrets in `VITE_` variables.                             |
| `NODE_ENV`          | API     | Set to `production` behind HTTPS to enable secure cookies and proxy handling.                                |

The `.env.example` values are placeholders. Never commit a real `.env`, database password, or session secret.

## Hosted portfolio deployment

The included Railway configuration deploys the API and built web app together, so login cookies stay first-party. Supabase provides hosted PostgreSQL. The API applies migrations and refreshes the curated seed when it starts.

1. Create a Supabase project on the Free plan and copy its PostgreSQL **session pooler** connection string (port 5432) as `DATABASE_URL`. Use the string from Supabase's Connect panel; do not paste it into Git or chat.
2. Push this repository to a GitHub repository, then create a Railway project from that repo. Railway detects `railway.json` and builds the web app and API.
3. Add `DATABASE_URL`, a fresh random `SESSION_SECRET` (at least 32 characters), and `NODE_ENV=production` to the Railway service variables. Generate a Railway public domain.
4. Set `WEB_ORIGIN` to that exact public origin (for example `https://your-app.up.railway.app`, without a trailing slash), then redeploy. Open `/api/health` and the home page to verify.

Supabase Free currently allows two projects and 500 MB per database, and pauses projects after one week of inactivity. Railway currently offers a $5/30-day trial and then $1/month of free usage credit; this may not keep an always-on service available. Review both providers' current limits before relying on the deployment. Vercel Hobby is free for personal, non-commercial projects, but it is not needed in this single-origin setup. A custom domain costs extra. No paid plan or domain is required by the project configuration.

## API overview

All routes are prefixed with `/api`. Errors use `{ "error": { "message": "…" } }`.

| Method             | Route                  | Access               | Purpose                                                           |
| ------------------ | ---------------------- | -------------------- | ----------------------------------------------------------------- |
| GET                | `/health`              | Public               | API liveness.                                                     |
| GET                | `/products`            | Public               | Search (`q`), category, brand, price range, sort, and pagination. |
| GET                | `/products/:slug`      | Public               | Product detail.                                                   |
| GET                | `/categories`          | Public               | Categories and product counts.                                    |
| POST               | `/auth/register`       | Public, rate limited | Create account and start session.                                 |
| POST               | `/auth/login`          | Public, rate limited | Verify credentials and start a fresh session.                     |
| POST               | `/auth/logout`         | Session              | Destroy session.                                                  |
| GET                | `/auth/me`             | Public               | Return the current user or `null`.                                |
| GET, POST          | `/wishlist`            | Session              | List or add a product to the current user’s wishlist.             |
| DELETE             | `/wishlist/:productId` | Session              | Remove an item from the current user’s wishlist.                  |
| GET, POST          | `/comparisons`         | Session              | List or save named comparisons.                                   |
| GET, PATCH, DELETE | `/comparisons/:id`     | Session              | Read, edit, or delete an owned comparison.                        |

Product listing accepts `q`, `category`, `brand`, `minPrice`, `maxPrice`, `sort=name|price-asc|price-desc`, `page`, and `pageSize` (maximum 48). It returns `{ items, total, page, pageSize, pages }`. Rating sort is omitted because this demo catalog has no verified rating data.

## Database notes

- Monetary values use PostgreSQL `DECIMAL(10,2)`, not floating-point storage.
- Searchable product fields and category relationships are relational; category-specific specifications use JSONB.
- Wishlist `(userId, productId)` and comparison `(comparisonId, productId)` pairs are unique.
- Deleting a user cascades their private lists. Product category deletion is restricted to protect catalog integrity.
- Saved comparisons are checked for ownership before reads or writes; products in one comparison must share a category.
- The initial migration is in `apps/api/prisma/migrations`. Schema changes should be made in Prisma and captured in a new migration.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The API tests mock database calls for catalog validation, pagination, health, and unauthenticated access. The web test covers a catalog-to-comparison interaction. Use a configured database to exercise migrations, seed, registration, persistence, and cross-session behavior manually.

## Deployment preparation

The repository is structured for a separately hosted web app and Node API backed by PostgreSQL, but it has not been deployed. No provider is selected here: check current pricing, trial limits, payment-card requirements, region availability, and connection-pooling behavior before choosing a host. Set production environment variables in the host’s secret manager, configure the exact `WEB_ORIGIN`, use HTTPS, and ensure the database connection supports the PostgreSQL session store. Do not commit production credentials. Do not use Render for this project.

## Screenshots

The local application now has seeded API-backed data. Add genuine screenshots after completing visual review at mobile, tablet, laptop, and desktop widths; this checkout does not yet include screenshot assets.

## Current limitations and next steps

- A local PostgreSQL container and ignored `.env` are configured in this checkout; another developer will need to create their own `.env` before running the database-backed flows.
- Catalog products are fictional demo data with original in-app SVG illustrations; there are no real product photographs, reviews, ratings, purchases, or external retail links.
- The current dependency audit flags a high-severity advisory in the Prisma 6 development CLI’s `deepmerge-ts` dependency. The suggested automatic fix jumps to Prisma 7, so the CLI remains on the tested Prisma 6 line pending a deliberate upgrade and migration check.
- Deployment configuration and provider selection remain to be completed after checking current platform requirements.
- A production deployment should also choose a deployment-specific session-secret rotation and database backup process.
