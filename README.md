# Messaging Platform

A real-time messaging backend (Node.js, Express, TypeScript, Socket.IO, MongoDB) with JWT-cookie auth, friends/direct messaging, and Firebase push notifications — currently being split into microservices behind a single API gateway, alongside a new **Daily Expense Tracker** service backed by PostgreSQL/Prisma.

## Current architecture

The system is mid-migration from a single monolith into independent services. Today:

- **The monolith** (`src/`, repo root) still owns 100% of auth, friends, and real-time messaging (MongoDB + Redis + Socket.IO + Firebase Admin). It runs unchanged and continues to serve production traffic.
- **`services/gateway`** — a thin reverse proxy (new) that will become the single public entry point for both REST and Socket.IO. Today it proxies `/v1/api/expenses/*` to the new expense-service and everything else to the still-unsplit monolith.
- **`services/expense-service`** — a brand-new, fully independent service (PostgreSQL + Prisma) for the expense tracker feature. It only trusts the shared `JWT_SECRET`-signed cookie; it has no dependency on Mongo, Redis, or any other service.
- **`packages/shared-auth`**, **`packages/shared-errors`**, **`packages/shared-config`** — code shared across services (JWT verification, error classes, CORS) so auth/error logic isn't reimplemented per service.

Planned next steps (not yet done): extracting `auth-service`, `user-service`, and `messaging-service` out of the monolith, one at a time, behind the gateway. See the migration plan for the full rollout sequence and rationale.

## Repository layout

```
src/                        # the existing monolith — auth, friends, messaging, Socket.IO (untouched)
client/                     # Vite/React frontend
packages/
  shared-auth/               # JWT verification, Express auth middleware, Socket.IO handshake auth
  shared-errors/              # CustomError hierarchy + base error middleware
  shared-config/              # CORS origin resolution
services/
  gateway/                    # public-facing REST + WebSocket proxy
  expense-service/             # daily expense tracker (PostgreSQL + Prisma)
docker-compose.yaml          # monolith replicas + postgres + expense-service + gateway
```

## Prerequisites

- Node.js v20+
- npm
- Docker (for Postgres locally, and for full-stack verification via `docker compose`)
- MongoDB + Redis reachable via `.env` (Atlas/Redis Cloud in production, or local instances in dev)

## Getting started

### Run the existing monolith only (unchanged workflow)

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, REDIS_*, FIREBASE_* etc.
npm run dev
```

Starts on `http://localhost:1500` (or `PORT` from `.env`).

### Run the new services (gateway + expense-service) locally

```bash
npm install                 # installs root + all workspaces (services/*, packages/*)
cp services/expense-service/.env.example services/expense-service/.env
cp services/gateway/.env.example services/gateway/.env
# JWT_SECRET in services/expense-service/.env MUST match the monolith's .env exactly
npm run dev:services        # boots gateway + expense-service together via concurrently
```

`expense-service` needs a real Postgres reachable at its `DATABASE_URL` — either run one locally or use the Docker Compose flow below.

### Full stack via Docker Compose

```bash
docker compose up -d --build postgres expense-service gateway
```

This brings up Postgres, the expense-service (running its own `prisma migrate deploy` on start), and the gateway (proxying `/v1/api/expenses/*` to expense-service and everything else to `app1`, one of the monolith replicas). Add `app1 app2 app3` to the command to also bring up the monolith itself.

## Available scripts (root)

- `npm run dev` — monolith dev server (`ts-node-dev` on `src/index.ts`)
- `npm run build` — compile the monolith
- `npm start` — run the compiled monolith
- `npm run dev:services` — boot `services/gateway` + `services/expense-service` together
- `npm run build:services` — build every workspace under `services/*`/`packages/*`

Each workspace under `services/*` also has its own `dev`/`build`/`start` (e.g. `npm run dev -w services/expense-service`).

## API overview

All REST endpoints are namespaced under `/v1/api`. Each service (and the monolith) exposes interactive Swagger docs at `/api-docs` while running standalone.

### Monolith (auth / friends / messaging)

- `POST /v1/api/auth/register`, `/login`, `/logout`, `GET /auth/user`, `PUT /auth/fcmtoken`
- `GET /v1/api/users`, `POST /users/addfriend`, `GET /users/friendrequest`, `PUT /users/confirm_request`, `GET /users/friends`, `PUT /users/avatar`
- `GET /v1/api/conversations/:friend_id/messages`
- Socket.IO events: `sendDirectMessage`, `typing`, `markAsRead`, `newDirectMessage`, `messageSent`, `messageRead`, `userOnline`, `userOffline`

### Expense tracker (new)

- `POST /v1/api/expenses` — create an expense
- `GET /v1/api/expenses` — list expenses (filter by `startDate`/`endDate`/`category`, paginated)
- `GET /v1/api/expenses/:id` — get one
- `PUT /v1/api/expenses/:id` — update
- `DELETE /v1/api/expenses/:id` — delete
- `GET /v1/api/expenses/summary` — totals grouped by day or category

All expense endpoints require the same `token` JWT cookie issued by the monolith's auth flow, and are always scoped to the authenticated user.

## Environment variables

See `.env.example` (monolith), `services/expense-service/.env.example`, and `services/gateway/.env.example`. The one hard rule across every service: **`JWT_SECRET` must be byte-identical everywhere** — it is never rotated as part of the ongoing service split, since doing so would invalidate every currently-issued session cookie.

## Deployment

Production target is Render.com (see the "Render production checklist" comments in `.env.example`). MongoDB and Redis stay on their existing external providers (Atlas / Redis Cloud) throughout the migration; only the expense-service introduces a new managed Postgres instance.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Apache License
