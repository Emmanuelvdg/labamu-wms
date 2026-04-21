# PostgreSQL Setup & Multi-Tenancy Migration

## Prerequisites

Start PostgreSQL (one of):
```bash
# Option A — Docker Desktop (recommended)
docker compose up -d postgres

# Option B — WSL with PostgreSQL
sudo service postgresql start

# Option C — Native Windows PostgreSQL service
net start postgresql-x64-15
```

## 1 — Generate Prisma Client

```bash
cd packages/database
npx prisma generate
```

## 2 — Run Migrations

This creates all tables in the `labamu_ims` PostgreSQL database:

```bash
cd packages/database
npx prisma migrate dev --name init_multitenancy
```

> If you have an existing SQLite dev.db with data you want to keep, run the
> seed in step 3 first — it will backfill `companyId` on all existing rows.

## 3 — Seed Default Company + Admin User

```bash
cd packages/database
npx prisma db seed
```

This creates:
- Company **Labamu** (`slug: labamu`)
- Role **Admin** (all permissions) scoped to that company
- User `admin@labamu.co.id` / `password123`
- Backfills `companyId` on all existing Products, Warehouses, Suppliers, Customers, Users, Roles

## 4 — Start the API

```bash
cd apps/api
npm run dev
```

## 5 — Start the Web App

```bash
cd apps/web
npm run dev
```

---

## Environment Variables

### apps/api/.env
```
DATABASE_URL=postgresql://labamu:password@localhost:5432/labamu_ims
JWT_SECRET=labamu-jwt-secret-change-in-production-please
JWT_EXPIRES_IN=7d
```

### apps/web/.env.local (optional — defaults apply)
```
API_URL=http://127.0.0.1:3001
```

---

## Registering a New Company (Self-Service Onboarding)

```bash
curl -X POST http://localhost:3001/companies/register \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Acme Logistics",
    "slug": "acme",
    "plan": "GROWTH",
    "adminName": "Alice Smith",
    "adminEmail": "alice@acme.com",
    "adminPassword": "securepassword"
  }'
```

## Inviting a User to a Company

```bash
curl -X POST http://localhost:3001/companies/<companyId>/invite \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <jwt>' \
  -d '{ "email": "bob@acme.com", "name": "Bob Jones" }'
```
