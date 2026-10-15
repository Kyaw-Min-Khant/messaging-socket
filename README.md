# Messaging Platform

Real-time messaging (friends, DMs, Socket.IO, FCM) plus a daily expense tracker. One public origin — the **gateway** — fronts chat-service (auth, users, chat history), socket-go (real-time) and expense-service (Postgres). The React client never talks to a backend directly.

---

## Table of contents

1. [System topology](#system-topology)
2. [Request flow](#request-flow)
3. [Repository layout](#repository-layout)
4. [Expense-service API](#expense-service-api)
5. [Data stores](#data-stores)
6. [Getting started](#getting-started)
7. [Environment](#environment)
8. [Deployment](#deployment)

More detail: [Socket.IO API](docs/socket-api.md) · [Data model](docs/Messaging%20Socket%20Data%20Model.md)

---

## System topology

```
Browser  (Vite :3000 / Vercel)
   │  REST  /v1/api/*     +     WebSocket  /socket.io
   ▼
Gateway  (:4000)                         ← only public origin
   │  CORS, security headers, gzip, access log
   │  stamps X-Internal-Secret
   │  rate-limits /v1/api (100/min per IP), plus /auth/login|register (50 / 30 min)
   │
   ├── /v1/api/expenses/**  →  Expense service (:4004)  →  PostgreSQL
   ├── /v1/api/**           →  chat-service (:1500)     →  MongoDB + Redis + FCM
   └── /socket.io           →  socket-go (:1600, Go)    →  MongoDB + Redis + FCM
```

`INTERNAL_SECRET` is what makes the gateway a trust boundary. chat-service, socket-go and expense-service are public URLs on Render (private services are not on the free plan), so they reject any request that is missing that header with `403 {"success":false,"error":"Forbidden."}`.

Locally, Vite proxies `/v1/api` and `/socket.io` to the gateway (`VITE_API_PROXY_TARGET=http://localhost:4000`). In production the client sets `VITE_API_URL` to the gateway’s `/v1/api`.

---

## Request flow

### Login

```
POST /v1/api/auth/login  { email, password }
        │
        ▼
Gateway  general limiter (100/min) + auth limiter (50 / 30 min) per IP → proxy + X-Internal-Secret
        │
        ▼
chat-service  auth_service
   1. User.findOne({ email })          MongoDB
   2. bcrypt.compare
   3. jwt.sign({ userId, username, email }, JWT_SECRET, 15d)
   4. Set-Cookie: token=…; HttpOnly
        │
        ▼
Browser stores the cookie. Later REST + Socket.IO send it automatically.
```

Local HTTP uses `SameSite=Lax`. Deployed (`NODE_ENV=production` or `golive`) uses `Secure; SameSite=None; Partitioned` because the web app and API are different sites.

### Authenticated REST (chat / users)

```
GET /v1/api/users   Cookie: token=<jwt>
        │
        ▼
Gateway → chat-service
        │
        ▼
auth middleware
   jwt.verify → Redis GET user:{id} (60s) → else MongoDB → SETEX
   req.user = hydrated user
        │
        ▼
controller → JSON
```

### Expense REST

```
GET /v1/api/expenses/categories   Cookie: token=<jwt>
        │
        ▼
Gateway  matches /v1/api/expenses → expense-service + x-internal-secret
        │
        ▼
expense-service
   internal-secret guard
   cookieParser
   shared-auth jwt.verify   (no user DB — claims become req.user)
        │
        ▼
controller → Prisma → PostgreSQL
```

Both services share `JWT_SECRET`. Expense-service never calls chat-service to resolve a user.

### Socket.IO

```
io('/', { withCredentials: true })
        │
        ▼
Gateway /socket.io  (HTTP poll, then WS upgrade — both stamped)
        │
        ▼
socket-go handshake
   X-Internal-Secret check (403 without it)
   cookie token or handshake.auth.token → JWT verify (HS256)
   join room <userId>       (every tab/device of a user)
   Redis HSET connectedUsers
   MongoDB isOnline = true
        │
        ├── sendDirectMessage → persist → emit to recipient's room, or FCM if offline
        ├── typing / markAsRead
        └── disconnect → clear Redis; isOnline=false + lastSeen once the last socket closes
```

Events and payloads: [docs/socket-api.md](docs/socket-api.md).

---

## Repository layout

```
services/
  chat-service/               auth, users, friends, chat history (Express + Mongoose)
    src/app.ts                Express app + internal-secret guard
    src/index.ts              HTTP server, env check, graceful shutdown
    src/controllers/          auth, users, messages
    src/middleware/           JWT+Redis auth, internal_auth, errors
    src/models/               Mongoose: User, Message, Conversation, Friend
    src/routes/               /auth, /users, /conversations
    src/services/             auth, users, messages, FCM
    src/config/               cors, mongo, redis, firebase, validateEnv
  gateway/                    Public entry in Go — CORS, rate limit, security headers, proxies
    cmd/server/main.go        routes + middleware chain, graceful shutdown
    internal/config/          env vars (adds http:// to Render host:port values)
    internal/proxy/           expense → :4004, /socket.io → :1600, everything else → :1500
    internal/middleware/      CORS, rate limiter, helmet-style headers, access log, client IP
    internal/health/          /health (liveness), /health/ready (probes upstreams)
  socket-go/                  Socket.IO server in Go (replaced the Node socket server)
    cmd/server/main.go        connects Mongo/Redis/FCM, internal-secret check, /health, shutdown
    internal/config/          env vars (same names as chat-service)
    internal/auth/            JWT from `token` cookie or handshake.auth.token
    internal/socket/          event handlers (see docs/socket-api.md)
    internal/store/           MongoDB writes, Mongoose-compatible documents
    internal/presence/        Redis `connectedUsers` hash
    internal/push/            FCM notifications (no-op when Firebase is not configured)
  expense-service/            Expense tracker (Express + Prisma)
    prisma/schema.prisma
    prisma/seed.ts
    src/app.ts                health, Swagger, internal-secret, routes
    src/docs/openapi.ts       OpenAPI 3 spec
    src/controllers/          expense, category, budget, income, recurring, report
    src/services/
    src/routes/               mounted under /v1/api/expenses/*

packages/
  shared-auth/                JWT verify + Express / Socket helpers
  shared-config/              CORS, shutdown
  shared-errors/              typed HTTP errors

client/                       Vite + React (not an npm workspace)
  src/api/                    axios client (cookie credentials)
  src/pages/                  Login, Register, Chat, Profile, Expenses
  src/components/expenses/    Budgets, Income, Recurring, Reports, categories
```

Workspaces are `services/*` and `packages/*` only. The web app is started with `cd client && npm run dev`.

---

## Expense-service API

Interactive docs (no auth required to *view*):

| | URL |
|---|---|
| Swagger UI | http://localhost:4004/api-docs |
| OpenAPI JSON | http://localhost:4004/api-docs.json |
| chat-service Swagger | http://localhost:1500/api-docs |

In Swagger UI pick the **Local gateway** server, then **Authorize** with the JWT from the `token` cookie (`POST /v1/api/auth/login` on the gateway). Trying the expense-service host directly returns 403 when `INTERNAL_SECRET` is set.

| Method | Path | Auth | What it does |
|--------|------|------|----------------|
| GET | `/v1/api/health` | — | Postgres probe (unguarded) |
| GET/POST | `/v1/api/expenses/categories` | ✓ | List / create categories |
| PUT/DELETE | `/v1/api/expenses/categories/:id` | ✓ | Update / delete *custom* categories |
| GET/POST | `/v1/api/expenses` | ✓ | List (filters: `startDate`, `endDate`, `category`, `page`, `limit`) / create |
| GET/PUT/DELETE | `/v1/api/expenses/:id` | ✓ | One expense |
| GET | `/v1/api/expenses/summary` | ✓ | Totals by `groupBy=day\|category` |
| GET/POST | `/v1/api/expenses/budgets` | ✓ | Monthly limits (`categoryId` omitted = overall) |
| GET | `/v1/api/expenses/budgets/status` | ✓ | Spent vs limit (`month=YYYY-MM`) |
| PUT/DELETE | `/v1/api/expenses/budgets/:id` | ✓ | Update amount / delete |
| GET/POST | `/v1/api/expenses/income` | ✓ | List / record income |
| GET/PUT/DELETE | `/v1/api/expenses/income/:id` | ✓ | One income row |
| GET/POST | `/v1/api/expenses/recurring` | ✓ | List / create rules (back-fills due occurrences) |
| GET/PUT/DELETE | `/v1/api/expenses/recurring/:id` | ✓ | One rule (delete keeps generated expenses) |
| POST | `/v1/api/expenses/recurring/:id/pause` | ✓ | Pause (no back-fill on resume) |
| POST | `/v1/api/expenses/recurring/:id/resume` | ✓ | Resume |
| GET | `/v1/api/expenses/reports/monthly` | ✓ | Income, expense, net, breakdowns |
| GET | `/v1/api/expenses/reports/export` | ✓ | CSV (`type=expense\|income`, `from`, `to`) |

Creating or updating an expense may include `budgetWarnings` when a touched budget is at least 80% used.

### chat-service routes (also via the gateway)

| Method | Path | Auth | |
|--------|------|------|--|
| POST | `/v1/api/auth/register` | — | Create account |
| POST | `/v1/api/auth/login` | — | Sets `token` cookie |
| POST | `/v1/api/auth/logout` | ✓ | Clears cookie |
| GET | `/v1/api/auth/user` | ✓ | Current user |
| PUT | `/v1/api/auth/fcmtoken` | ✓ | FCM token |
| GET | `/v1/api/users` | ✓ | Discoverable users |
| GET | `/v1/api/users/friends` | ✓ | Friends |
| GET | `/v1/api/users/friendrequest` | ✓ | Pending requests |
| POST | `/v1/api/users/addfriend` | ✓ | Send request |
| PUT | `/v1/api/users/confirm_request` | ✓ | Accept |
| PUT | `/v1/api/users/avatar` | ✓ | Avatar |
| GET | `/v1/api/conversations/:friend_id/messages` | ✓ | History |
| GET | `/v1/api/health` | — | Mongo + Redis |
| GET | `/health` | — | Gateway liveness |
| GET | `/health/ready` | — | Gateway readiness: probes chat-service, expense-service and socket-go |

---

## Data stores

**MongoDB (chat-service, socket-go)** — `User`, `Message`, `Conversation` (2 participants), `Friend` (`pending` / `accepted` / `blocked`).

**PostgreSQL (expense-service)**

| Model | Notes |
|-------|--------|
| `ExpenseCategory` | `userId` null = global seed; otherwise owned |
| `Expense` | `userId` from JWT (no FK). Indexes `(userId, spentAt)`, `(userId, categoryId)` |
| `Budget` | Unique `(userId, categoryId)`; null category = overall cap |
| `Income` | Indexed `(userId, receivedAt)` |
| `RecurringExpense` | `DAILY` / `WEEKLY` / `MONTHLY` / `YEARLY`; generates `Expense` rows |

Amounts are `Decimal(12,2)`, serialized as `"5000.00"`. Payment methods: `CASH`, `KBZ_PAY`, `AYA_PAY`, `ONLINE_PAYMENT`.

**Redis** — `user:{id}` (60s profile cache, chat-service), `connectedUsers` hash for presence (socket-go).

---

## Getting started

Need five processes: chat-service `:1500`, socket-go `:1600`, gateway `:4000`, expense-service `:4004`, client `:3000`.

```bash
# env files (from repo root) — JWT_SECRET and INTERNAL_SECRET must match in all of them
cp services/chat-service/.env.example services/chat-service/.env   # Mongo, Redis, Firebase, …
cp services/gateway/.env.example services/gateway/.env
cp services/expense-service/.env.example services/expense-service/.env
cp services/socket-go/.env.example services/socket-go/.env       # same Mongo/Redis/JWT/Firebase values as chat-service

# all backends at once (Go 1.26+ for gateway and socket-go)
npm install
npm run dev:services          # chat :1500 + socket-go :1600 + gateway :4000 + expense :4004

cd services/expense-service
npm run prisma:migrate
npm run prisma:seed           # default categories

# client (not a workspace)
cd client
cp .env.example .env
# VITE_API_PROXY_TARGET=http://localhost:4000
# VITE_EXPENSE_API_PROXY_TARGET=http://localhost:4000
npm install
npm run dev                   # :3000
```

Then open http://localhost:3000 and http://localhost:4004/api-docs.

Go tests:

```bash
cd services/gateway && go test ./...
cd services/socket-go && go test ./...
```

Docker (gateway on host port 80):

```bash
docker compose up -d --build
```

In Docker, socket-go reads `services/chat-service/.env`. `client` is not in the compose file — still run Vite, and point the proxy at `http://localhost` (port 80) if you use that stack.

---

## Environment

Shared across services:

| Variable | Who | Notes |
|----------|-----|--------|
| `JWT_SECRET` | all backends | Must be identical |
| `INTERNAL_SECRET` | gateway + chat-service + socket-go + expense | Must be identical. Leave empty on a backend only if Vite talks to it directly |
| `CLIENT_URL` | gateway (and backends for CORS) | Comma-separated origins |

chat-service and socket-go also need `MONGODB_URI` (or `DEV_MONGODB_URI`), Redis (`REDIS_URL` / `DEV_REDIS_*`), and Firebase Admin keys in non-dev. Expense-service needs `DATABASE_URL`. Gateway needs `CHAT_SERVICE_URL`, `EXPENSE_SERVICE_URL` and `SOCKET_SERVICE_URL`; `TRUST_PROXY_HOPS` (default `1`, Render's edge) sets how many proxies' `X-Forwarded-For` entries to trust for rate limiting.

Client: `VITE_API_PROXY_TARGET` / `VITE_EXPENSE_API_PROXY_TARGET` (local) or `VITE_API_URL` (production gateway). Firebase web keys for push.

---

## Deployment

`render.yaml` Blueprint: **gateway** (public), **chat-service**, **socket-go**, **expense-service**. Downstream URLs come from `fromService.hostport`; the gateway adds `http://`. Health: gateway `/health`, chat-service `/v1/api/health`, socket-go `/health`, expense `/v1/api/health`.

Expense-service start: `npx prisma migrate deploy && npm start`.

The Vercel client should set `VITE_API_URL` to `https://<gateway>/v1/api` — never to chat-service, socket-go or expense-service.

---

## License

Apache License
