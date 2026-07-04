# Compliance Risk Hub (CRH)

Compliance Risk Hub is a full-stack enterprise information system for managing the complete
lifecycle of compliance risks — identification, registration, assessment, monitoring,
mitigation, control effectiveness and reporting — built to the PRD in `docs/`.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full technical architecture,
data model and API reference.

## Modules (MVP)

Dashboard · Risk Register · Risk Card (info, assessment, sources, controls, actions,
comments, attachments, history) · Risk Library (risk categories) · Risk Sources · Controls ·
Action Plans · Incidents · Analytics (heat maps, trends, top lists, control effectiveness) ·
Reports (CSV/Excel/PDF) · Notifications · Administration (users, companies, departments,
audit log, settings) · JWT authentication with 7-role RBAC.

## Tech stack

- **Backend**: NestJS 10 + TypeScript, Prisma 6, PostgreSQL 16, JWT auth, Swagger/OpenAPI.
- **Frontend**: React 19 + TypeScript + Vite, Ant Design 6, TanStack Query, Zustand.
- **Reports**: ExcelJS, csv-writer, PDFKit.
- **Infra**: Docker / docker-compose.

## Running locally

### Option A — Docker Compose (Postgres + API + SPA)

```bash
docker compose up --build
```

- API: http://localhost:3000/api (Swagger docs at `/api/docs`)
- Frontend: http://localhost:5173

Run migrations + demo seed data once the containers are up:

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

### Option B — Run backend and frontend directly (requires local PostgreSQL 16)

```bash
# 1. Backend
cd backend
cp .env.example .env         # adjust DATABASE_URL / JWT secrets if needed
npm install
npx prisma migrate dev       # creates schema
npx prisma db seed           # demo companies/departments/users/risks
npm run start:dev            # http://localhost:3000/api

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

### Demo accounts

All seeded users share the password `ChangeMe123!`:

| Email                  | Role                |
|-------------------------|---------------------|
| admin@crh.local         | Administrator       |
| officer@crh.local       | Compliance Officer   |
| manager@crh.local       | Compliance Manager   |
| owner@crh.local         | Risk Owner           |
| deptmgr@crh.local       | Department Manager   |
| audit@crh.local         | Internal Audit       |
| board@crh.local         | Board                |

## Repository layout

```
backend/    NestJS REST API, Prisma schema/migrations, seed script
frontend/   React + Ant Design single-page application
docs/       Architecture documentation
docker-compose.yml
```
