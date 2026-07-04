# Compliance Risk Hub — Architecture

## 1. Overview

Compliance Risk Hub (CRH) is a full-stack enterprise information system for managing the
end-to-end lifecycle of compliance risks: identification, registration, assessment,
monitoring, mitigation, control and reporting. This document describes the technical
architecture chosen for the MVP and the rationale behind it.

## 2. Technology stack

| Layer          | Choice                                             | Rationale |
|----------------|-----------------------------------------------------|-----------|
| Backend        | **NestJS 10** (Node.js, TypeScript)                | Opinionated, modular, DI-based framework well suited to enterprise REST APIs; first-class support for guards/interceptors (RBAC, audit), Swagger, validation. |
| ORM / DB       | **Prisma 6** + **PostgreSQL 16**                   | Type-safe schema & migrations, relational integrity for a highly relational domain (risks ↔ sources ↔ controls ↔ actions), mature and widely deployed in production. |
| Auth           | **JWT** (access + rotating refresh tokens) via `@nestjs/jwt` / `passport-jwt` | Stateless, scalable, standard for SPA + REST API separation. Refresh tokens are hashed and stored server-side so they can be revoked (logout, rotation). |
| Frontend       | **React 19 + TypeScript + Vite**                   | Fast dev/build tooling, huge ecosystem, easy to scale to a larger team. |
| UI Kit         | **Ant Design 6**                                   | Enterprise-grade component library (tables, forms, trees) that matches the "admin/back-office" nature of a compliance system out of the box. |
| Charts         | **@ant-design/charts**                             | Consistent visual language with the UI kit for dashboards/analytics. |
| Data fetching  | **TanStack Query**                                 | Caching, request de-duplication and background refresh for REST resources. |
| Client state   | **Zustand**                                        | Minimal global state (current user/session) without Redux boilerplate. |
| Reporting      | **ExcelJS**, **csv-writer**, **PDFKit**            | Generate genuine .xlsx/.csv/.pdf files server-side from live data (no client-side print-to-pdf hacks). |
| Containerization | **Docker / docker-compose**                       | Reproducible local & production-like environment (Postgres + API + SPA). |

The stack is intentionally "boring" and mainstream: every piece is widely used in production
enterprise systems, well documented, and easy to hire for — appropriate for a compliance/risk
system that will need to be maintained for years and pass security/audit reviews.

## 3. High-level architecture

```
┌─────────────────────┐        HTTPS/JSON        ┌───────────────────────────┐
│   React SPA (Vite)  │  ───────────────────────▶ │   NestJS REST API (/api)  │
│  Ant Design UI       │ ◀─────────────────────── │   JWT auth + RBAC guards  │
└─────────────────────┘                            └─────────────┬─────────────┘
                                                                   │ Prisma
                                                                   ▼
                                                     ┌───────────────────────────┐
                                                     │      PostgreSQL 16        │
                                                     └───────────────────────────┘
```

The system is a classic 3-tier web application:

1. **Presentation** — a single-page React application that talks exclusively to the backend
   REST API (no server-side rendering, no direct DB access from the browser).
2. **Application / API** — a modular NestJS application exposing a versioned REST API under
   `/api`, documented with Swagger/OpenAPI at `/api/docs`.
3. **Data** — a normalized PostgreSQL schema managed by Prisma migrations.

## 4. Backend module structure

```
backend/src/
  prisma/                 # PrismaService (DB client) — @Global module
  common/                 # cross-cutting guards, decorators, filters, DTO helpers
  modules/
    auth/                 # login / refresh / logout / change-password, JWT strategy
    users/                # user CRUD, "me" endpoint
    companies/                     ┐
    departments/                   │  organizational reference data
    business-processes/            │  (used to classify/scope risks)
    categories/                    ┘  ("Risk Library")
    sources/               # risk sources (Hotline, Audit, Media, ESG, ...)
    risks/                 # Risk Register + Risk Card: CRUD, lifecycle, assessment, history
    controls/              # Preventive / Detective / Corrective controls per risk
    actions/                # Action plans (mitigation tasks) per risk
    incidents/              # Incidents that can create/update/close/escalate a risk
    comments/               # Risk discussion thread
    attachments/            # File upload/download (disk storage + metadata)
    audit/                   # Immutable audit log (@Global, injected by every module)
    analytics/               # Heat maps, trends, top lists, control effectiveness
    dashboard/               # Aggregated KPI summary for the home dashboard
    reports/                 # CSV / XLSX / PDF report generation
    notifications/          # In-app notifications + daily overdue-action sweep (cron)
```

Each domain module follows the same shape: `*.module.ts` (DI wiring), `*.controller.ts`
(HTTP surface + `@Roles(...)` guards), `*.service.ts` (business logic via Prisma), and
`dto/*.ts` (request validation with `class-validator`).

### Cross-cutting concerns

- **Authentication**: a global `JwtAuthGuard` (registered as `APP_GUARD`) protects every
  route by default; routes are opted out with `@Public()` (login/refresh/logout only).
- **Authorization (RBAC)**: a global `RolesGuard` + `@Roles(...)` decorator restrict mutating
  endpoints to the roles defined in the PRD (Administrator, Compliance Officer, Compliance
  Manager, Risk Owner, Department Manager, Internal Audit, Board). Read endpoints are open to
  any authenticated role; the UI additionally hides actions the current role cannot perform.
- **Audit trail**: `AuditService` (global) writes an `AuditLog` row for every create/update/
  status-change/delete across risks, controls, actions, incidents, comments and attachments.
- **Validation**: a global `ValidationPipe` (whitelist + transform) rejects unknown fields and
  coerces types from DTOs decorated with `class-validator`.
- **Rate limiting**: `@nestjs/throttler` guards the whole API against basic abuse.
- **Errors**: a global `AllExceptionsFilter` normalizes Nest/HTTP and Prisma errors into a
  consistent JSON error shape.

## 5. Data model

The domain model follows the four core entities named in the PRD — **Risk**, **Source**,
**Control**, **Action** — with every other entity (Incident, Comment, Attachment, History,
Category, Company, Department, Business Process, User, Notification, AuditLog) modeled as a
first-class relation around them. See `backend/prisma/schema.prisma` for the authoritative
schema; the key relationships are:

- `Risk` *N—N* `Source` (via `RiskSource`) — a risk can originate from any number of sources.
- `Risk` *1—N* `Control`, `Action`, `Incident`, `Comment`, `Attachment`, `RiskHistory`.
- `Risk` *N—1* `Category` (Risk Library), `Company`, `Department`, `BusinessProcess`, `User` (owner).
- Every mutation to a `Risk` writes a new `RiskHistory` snapshot and bumps `Risk.version`,
  giving full point-in-time traceability ("Версионность"/"История изменений" from the PRD).

### Risk lifecycle

```
Draft → New → Assessment → Approved → Monitoring → Mitigation → Residual Assessment → Closed → Archived
```

Transitions are enforced server-side (`RISK_LIFECYCLE` map in `risks.constants.ts`) so the
API rejects invalid jumps (e.g. Draft → Closed) even if the request bypasses the UI.

### Risk scoring

`inherentScore = likelihood × impact` (1-5 scale each, 25-point matrix), the same scheme is
applied to the residual assessment after controls/mitigation. Scores are bucketed into
Low/Medium/High/Critical for the heat map and KPI widgets.

## 6. REST API

All endpoints are namespaced under `/api` and documented interactively via Swagger UI at
`/api/docs` (generated from the DTOs/decorators, always in sync with the code). Highlights:

- `POST /api/auth/login`, `/refresh`, `/logout`, `/change-password`
- `GET/POST/PATCH/DELETE /api/risks`, plus `/risks/:id/assess`, `/risks/:id/status`, `/risks/:id/archive`
- `/api/sources`, `/api/controls`, `/api/actions`, `/api/incidents`, `/api/comments`, `/api/attachments`
- `/api/companies`, `/api/departments`, `/api/business-processes`, `/api/categories`, `/api/users`
- `/api/dashboard/summary`, `/api/analytics/*` (heatmap, trends, top-*, control-effectiveness, residual-risk)
- `/api/reports/:kind/export?format=csv|xlsx`, `/api/reports/board|audit-committee|compliance` (PDF)
- `/api/notifications`, `/api/audit-logs`

## 7. Frontend structure

```
frontend/src/
  api/          # axios client (JWT + auto-refresh interceptor) + typed endpoint modules
  auth/         # zustand auth store, ProtectedRoute, role helpers
  layout/       # MainLayout (sidebar nav + header + notifications), nav config
  hooks/        # React Query hooks for shared reference data (companies, users, categories, ...)
  pages/
    risks/      # Risk Register (table+filters) and Risk Card (tabs: info, assessment,
                # sources, controls, actions, comments, attachments, history)
    administration/  # Users, Companies, Departments, Audit Log, Settings (role-gated)
    ...         # Dashboard, Risk Library, Sources, Controls, Action Plans, Incidents,
                # Analytics, Reports
  types/        # Shared TypeScript types mirroring backend enums/entities
  utils/        # display formatting (status colors/labels), authenticated blob downloads
```

- Routing: `react-router-dom` with a single `ProtectedRoute` wrapper that redirects to
  `/login` when unauthenticated and otherwise renders `MainLayout` (sidebar filtered by role).
- Data fetching: TanStack Query for all server state (automatic caching/refetch); forms use
  Ant Design `Form` with `class-validator`-equivalent client-side rules mirroring the API.
- File downloads (attachments, CSV/XLSX/PDF reports) go through the authenticated axios
  client and are converted to a Blob download client-side, since these endpoints require a
  Bearer token that a plain `<a href>` cannot send.

## 8. Security

- Passwords hashed with `bcrypt` (never stored/returned in plaintext).
- JWT access tokens are short-lived (15 min default); refresh tokens are long-lived (7 days),
  stored server-side as a SHA-256 hash (not the raw token) and rotated on every refresh so a
  leaked refresh token can be invalidated.
- RBAC enforced server-side on every mutating endpoint; the UI is a convenience layer only.
- `helmet` sets standard security headers; CORS is restricted to the configured frontend origin.
- File uploads are restricted by MIME type allow-list and a 20MB size cap.
- All mutations are recorded in an immutable `AuditLog` (who / what / when / before-after).
- MFA is not implemented in the MVP but the auth module is structured (`AuthService`,
  `JwtStrategy`) so a second factor can be inserted into `login()` without reshaping the API.

## 9. What's next (Phase 2 / Phase 3, per PRD)

The MVP intentionally does not implement (left for later phases, as scoped in the PRD):
a graphical workflow engine, external system integrations (SAP/Oracle/Power BI/Teams),
document OCR, an AI copilot, or ML-based risk scoring/prediction. The current architecture
(clean module boundaries, a REST API documented via OpenAPI, an immutable audit log, and a
normalized relational schema) is designed so those can be added incrementally without a
rewrite — e.g. a workflow engine would sit behind the existing `risks/:id/status` endpoint,
and integrations would consume the same REST API or a future event bus fed by the audit log.
