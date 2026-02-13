# Federated Outreach Mini-CRM (Next.js + Prisma + PostgreSQL)

Mini-CRM for B2B outreach and Federated Learning prioritization.
Designed for small founder teams that need shared, real-time access from different locations.

## Stack

- Next.js (App Router) + TypeScript
- TailwindCSS
- shadcn-style component structure (`components/ui/*`)
- Prisma ORM + PostgreSQL (Neon/Supabase)
- zod validation

## Core Features

- Lead database with structured FL outreach fields
- VC-style scoring + priority buckets (1-5)
- Rule-based FL hypothesis generation + regenerate
- Industry fit clustering (High/Medium/Low) + manual override
- Leads table with sorting, filtering, inline edit, detail drawer
- Pipeline kanban (`New -> Contacted -> Replied -> Interview -> Pilot Candidate -> Pilot Running -> Won/Lost`)
- Outreach draft generation (short/medium/technical)
- CSV import/export (including filtered export)
- Follow-up widget + top-priority dashboard
- `dataTypes` matching between companies
- Flexible custom fields (add/remove in settings)
- Optional Basic Auth for private 2-person usage

## Priority Formula

```txt
priorityScore = digitalMaturity + dataIntensity + competitivePressure + coopLikelihood
```

Ranges:

- `digitalMaturity`: 0-3
- `dataIntensity`: 0-3
- `competitivePressure`: 0-2
- `coopLikelihood`: 0-2

Buckets:

- `0-2` => Priority `1`
- `3-4` => Priority `2`
- `5-6` => Priority `3`
- `7-8` => Priority `4`
- `9-10` => Priority `5`

## Local Setup (with remote Postgres)

1. Install deps:

```bash
npm install
```

2. Create env:

```bash
cp .env.example .env
```

3. Put your DB URLs in `.env`:

- `DATABASE_URL` = pooled URL (runtime)
- `DIRECT_URL` = direct URL (migrations)

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Apply schema:

```bash
npm run prisma:deploy
```

6. Seed sample data:

```bash
npm run prisma:seed
```

7. Start app:

```bash
npm run dev
```

Open: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## Online Setup For 2 Users (Vercel + Neon/Supabase)

### A) Create free Postgres DB

1. Create a free project in Neon or Supabase.
2. Copy two connection strings:
- pooled URL (for app traffic)
- direct URL (for Prisma migrations)

### B) Deploy Next.js app on Vercel

1. Push this project to GitHub.
2. In Vercel: `New Project` -> import repo.
3. Add Environment Variables in Vercel project settings:
- `DATABASE_URL` (pooled)
- `DIRECT_URL` (direct)
- Optional private access:
  - `BASIC_AUTH_USER`
  - `BASIC_AUTH_PASSWORD`
4. Deploy.

### C) Run DB migration once against production DB

From your local machine (project root):

```bash
DATABASE_URL="<POOLED_URL>" DIRECT_URL="<DIRECT_URL>" npx prisma migrate deploy
DATABASE_URL="<POOLED_URL>" DIRECT_URL="<DIRECT_URL>" npx prisma db seed
```

After that, both of you use the same Vercel URL and always see the same data.

## Why this is mostly free

- Vercel Hobby: free tier
- Neon/Supabase free Postgres tiers: usually enough for 2-user internal CRM usage

## Important Env Vars

- `DATABASE_URL`: pooled connection string for runtime
- `DIRECT_URL`: direct connection string for migration operations
- `BASIC_AUTH_USER`: optional username for app-wide basic auth
- `BASIC_AUTH_PASSWORD`: optional password for app-wide basic auth

## Scripts

- `npm run dev` - Next.js dev server
- `npm run build` - production build
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - local Prisma migration dev workflow
- `npm run prisma:deploy` - apply committed migrations (production-safe)
- `npm run prisma:push` - push schema without migration files
- `npm run prisma:seed` - seed demo leads

## Troubleshooting

1. `Cannot read properties of undefined (reading 'findMany')`
- Prisma client is outdated for your schema.
- Run:
```bash
npm run prisma:generate
```
- restart dev server.

2. `P1001` / DB connection errors
- verify `DATABASE_URL` and `DIRECT_URL`
- ensure DB project is running and allows connections

3. Deploy works but tables are missing
- run once:
```bash
DATABASE_URL="<POOLED_URL>" DIRECT_URL="<DIRECT_URL>" npx prisma migrate deploy
```

## Main Routes

- `/dashboard`
- `/leads`
- `/pipeline`
- `/settings`
