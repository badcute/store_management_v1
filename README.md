# Badcute — Phone Store Management

Local-network ERP for a phone-and-accessories reselling business. Tracks inventory
(phones, sim cards, accessories), imports & exports, multi-currency finance
(W / U / Y), clients, suppliers, partial-payment receivables and payables, and
role-based access for admin / manager / staff.

## Stack

| Layer       | Choice                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Turbopack)                                           |
| Runtime     | React 19                                                                     |
| Database    | PostgreSQL (local)                                                           |
| ORM         | Prisma 7 with `@prisma/adapter-pg`                                           |
| Auth        | NextAuth 4 (Credentials provider, bcrypt-hashed passwords, JWT)              |
| UI          | shadcn-style components on Radix (`button`, `dialog`, `popover`, `calendar`) |
| Styling     | Tailwind CSS v4 (CSS-variable theme, Sunset Orange + Rose palette)           |
| Forms       | React Hook Form + Zod v4                                                     |
| Charts      | Recharts 3                                                                   |
| Date picker | react-day-picker v10 + date-fns v4                                           |
| Icons       | lucide-react                                                                 |

## Setup

1. **PostgreSQL** — make sure a local Postgres is running and reachable on the
   URL you set in `.env`. Default expects `postgresql://postgres:postgres@localhost:5432/badcute`.

2. **Environment** — copy the example and edit it:

   ```bash
   cp .env.example .env
   ```

   Required keys:

   - `DATABASE_URL` — Postgres connection string
   - `NEXTAUTH_URL` — origin where the app runs (default `http://localhost:3000`)
   - `NEXTAUTH_SECRET` — long random string for JWT signing
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — used by `db:seed`

3. **Install** (already done in this checkout):

   ```bash
   npm install
   ```

4. **Database** — create tables and seed an admin user + W/U/Y currency rates:

   ```bash
   npm run prisma:migrate     # first time only — creates migration & applies it
   npm run db:seed            # creates admin user and currency rate placeholders
   ```

5. **Run**

   ```bash
   npm run dev                # http://localhost:3000
   ```

   Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## Scripts

| Script                 | What it does                                            |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Start Next dev server (Turbopack)                       |
| `npm run build`        | Production build                                        |
| `npm run start`        | Run production build                                    |
| `npm run typecheck`    | `tsc --noEmit`                                          |
| `npm run lint`         | ESLint                                                  |
| `npm run format`       | Prettier write                                          |
| `npm run prisma:migrate` | Create + apply a Prisma migration                     |
| `npm run prisma:deploy`  | Apply existing migrations (CI / prod)                 |
| `npm run prisma:studio`  | Open Prisma Studio                                    |
| `npm run db:seed`        | Seed admin user + W/U/Y rate placeholders             |
| `npm run db:reset`       | Reset and re-migrate the dev DB (DESTRUCTIVE)         |

## Roles

| Role        | Sees costs / suppliers | Edit inventory | Record imports | Record sales | Receive payment | Pay supplier | Update rates | User mgmt + audit |
| ----------- | :--------------------: | :------------: | :------------: | :----------: | :-------------: | :----------: | :----------: | :---------------: |
| **Admin**   |          ✓             |       ✓        |       ✓        |      ✓       |        ✓        |      ✓       |      ✓       |         ✓         |
| **Manager** |          ✓             |       ✓        |       ✓        |      ✓       |        ✓        |      ✓       |      ✓       |         —         |
| **Staff**   |          —             |       —        |       —        |      ✓       |        ✓        |      —       |      —       |         —         |

Staff cannot see purchase prices, supplier identities, `Imports`, `Suppliers`, or
`Finance`. Enforced at three layers: sidebar visibility, server-rendered pages,
and API route handlers.

## Project layout

```
src/
  app/
    (app)/              # authenticated app shell + feature pages
    api/                # NextAuth + REST endpoints (role-guarded)
    login/              # /login (Credentials)
    layout.tsx          # Root layout + providers
    globals.css         # Tailwind v4 theme tokens
  components/
    ui/                 # shadcn-style primitives (button, dialog, etc.)
    charts/             # Recharts wrappers
    ...                 # Toast, Sidebar, ClickableRow, Combobox, ...
  lib/
    prisma.ts           # Prisma client (uses pg adapter, single global instance)
    auth.ts             # NextAuth options + role helpers
    session.ts          # requireSession / requireRole
    api.ts              # API auth helpers
    currency.ts         # Pure conversion helpers (client-safe)
    currency.server.ts  # getLatestRates (server-only)
    balances.ts         # A/R + A/P calculations
    analytics.ts        # Daily revenue/cost/profit, sales mix, rate history
    audit.ts            # Audit log writes
    utils.ts            # cn(), formatters
prisma/
  schema.prisma         # Database schema
  seed.ts               # Admin + rate seed
prisma.config.ts        # Prisma 7 config (replaces datasource url in schema)
components.json         # shadcn CLI config
```

## Known limitations

- Currency conversions always use the *latest* exchange rate (not the rate at
  the time of each transaction). Acceptable for internal use; revisit if rates
  swing >10% inside the reporting window.
- The "Stock composition" chart is a current snapshot — there is no
  stock-value history (no daily snapshots are persisted).
- Deployment target is the local network only. No public hosting hardening.
