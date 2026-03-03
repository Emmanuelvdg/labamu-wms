# Labamu WMS — Deployment & Beta Operations Guide

This guide covers how to deploy the Labamu WMS platform for beta testers, manage environment configurations, and provision new tenant data.

## Prerequisites
- Node.js 18.x or 20.x
- PostgreSQL 14+ or equivalent cloud database
- npm (Node Package Manager)

## 1. Environment Configuration

### Backend API (`apps/api/`)
Create an `.env` file in the `apps/api/` directory:
```bash
cp apps/api/.env.example apps/api/.env
```
Fill out `DATABASE_URL`, `CORS_ORIGINS`, and any necessary Lalamove API details.

### Frontend Web App (`apps/web/`)
Create an `.env` file in the `apps/web/` directory:
```bash
cp apps/web/.env.example apps/web/.env
```
Ensure `API_URL` points to the hosted API URL.

## 2. Database Migration & Setup

Before starting the API, run the Prisma migrations to initialize the schema:

```bash
cd apps/api
npx prisma migrate deploy
```

> [!WARNING]
> Do **not** use `prisma db push` in production. Always use `prisma migrate deploy` to safely apply migrations to existing data.

### Seed User
For fresh beta tenants, create the initial administrator user:
```bash
npx ts-node scripts/seed-admin.ts
```
*(Ensure to update the admin email/password in the script before running).*

## 3. Starting the Applications

### Building for Production
It is recommended to build both apps rather than running them in dev mode:

**API:**
```bash
cd apps/api
npm run build
NODE_ENV=production PORT=3001 node dist/main.js
```

**Frontend:**
```bash
cd apps/web
npm run build
npm start
```

## 4. Security Checks before Beta Launch
- [ ] Verify CORS allows *only* the deployed frontend domain.
- [ ] Ensure `NODE_ENV=production` is set so secure cookies get activated.
- [ ] Database backups are configured (e.g., daily pg_dump).
- [ ] HTTPS/SSL is active on the proxy (Nginx/Cloudflare) routing to the API/Web app.
