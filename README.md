# Messaging Platform

A real-time messaging backend (Node.js, Express, TypeScript, Socket.IO, MongoDB) with JWT-cookie auth, friends/direct messaging, Firebase push notifications, and a standalone **Daily Expense Tracker** microservice (PostgreSQL + Prisma).

---

## Table of Contents

1. [System Topology](#system-topology)
2. [Repository Layout](#repository-layout)
3. [Backend Processing — Full Detail](#backend-processing--full-detail)
   - [Startup sequence](#startup-sequence)
   - [Middleware stack](#middleware-stack)
   - [Auth flow](#auth-flow-post-v1apiauthlogi)
   - [Protected REST request flow](#protected-rest-request-flow)
   - [Expense proxy flow](#expense-proxy-flow)
   - [Socket.IO real-time flow](#socketio-real-time-flow)
4. [API Routes](#api-routes)
5. [Data Models](#data-models)
6. [Environment Variables](#environment-variables)
7. [Getting Started](#getting-started)
8. [Deployment](#deployment)

---

## System Topology

```
┌────────────────────────────────────────────────────────────────┐
│  Client  (Vercel)                                              │
│  React 18 · Vite 5 · TypeScript                               │
│  axios + socket.io-client                                      │
│  VITE_API_URL = https://messaging-socket.onrender.com/v1/api  │
└───────────────────────┬────────────────────────────────────────┘
                        │  HTTP (REST) + WebSocket (Socket.IO)
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  Monolith  (Render · messaging-socket.onrender.com)            │
│  Express + Socket.IO · Node.js 20 · TypeScript                │
│                                                                │
│  /v1/api/auth/**         → auth controller                    │
│  /v1/api/users/**        → user controller                    │
│  /v1/api/conversations/** → message controller                │
│  /v1/api/expenses/**     → ── proxy ──────────────────────┐   │
│  ws://                   → Socket.IO handlers             │   │
│                                                           │   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  MongoDB    │  │    Redis     │  │   Firebase   │    │   │
│  │  Atlas      │  │  Redis Cloud │  │   FCM (push) │    │   │
│  │  users      │  │  user cache  │  └──────────────┘    │   │
│  │  messages   │  │  presence    │                       │   │
│  │  convos     │  │  socketIds   │                       │   │
│  └─────────────┘  └──────────────┘                       │   │
└───────────────────────────────────────────────────────────┼───┘
                                                            │  HTTP proxy (http-proxy-middleware)
                                                            ▼
┌────────────────────────────────────────────────────────────────┐
│  Expense Service  (Render · expense-service-8i5i.onrender.com) │
│  Express · Prisma ORM · TypeScript                             │
│                                                                │
│  /v1/api/expenses/categories                                   │
│  /v1/api/expenses/summary                                      │
│  /v1/api/expenses  (CRUD)                                      │
│                                                                │
│  ┌──────────────────────────────────┐                         │
│  │  PostgreSQL / Neon               │                         │
│  │  expenses · expense_categories   │                         │
│  └──────────────────────────────────┘                         │
└────────────────────────────────────────────────────────────────┘
```

One `VITE_API_URL` in the client. The monolith is the single entry point — it proxies expense requests internally.

---

## Repository Layout

```
src/                          # Monolith — auth, users, messaging, Socket.IO
  app.ts                      # Express app (middleware + proxy + routes)
  index.ts                    # HTTP server + Socket.IO server + startup
  controllers/
    auth_controller.ts
    users_controller.ts
    message_controller.ts
  middleware/
    auth.ts                   # JWT cookie → Redis → MongoDB user hydration
    error_middleware.ts
  models/                     # Mongoose schemas (User, Message, Conversation, Friend, Room)
  routes/                     # auth, user_route, message_route, index
  services/                   # auth_service, user_service, message_service, fcm_service
  socket/
    index.ts                  # Socket.IO event handlers
  config/                     # cors, database, firebase, redis

services/
  expense-service/
    prisma/
      schema.prisma           # Expense, ExpenseCategory, PaymentMethod enum
      seed.ts                 # seeds 11 categories
      migrations/
    src/
      app.ts
      controllers/expense_controller.ts
      middleware/auth.ts      # shared-auth (JWT verify only, no DB lookup)
      services/expense_service.ts
      validators/expense_validator.ts
      utils/serializeExpense.ts
  gateway/                    # standalone gateway (not used in current prod deploy)

packages/
  shared-auth/                # JWT verification + Express middleware factory
  shared-errors/
  shared-config/

client/                       # Vite + React frontend
  src/
    api/
      client.ts               # single axios instance (VITE_API_URL)
      expenses.ts             # all expense API calls via the same client
    pages/Expenses.tsx
    types/index.ts

render.yaml                   # Render Blueprint (monolith + expense-service)
docker-compose.yaml
```

---

## Backend Processing — Full Detail

### Startup sequence

`src/index.ts` runs these steps before accepting any connection:

1. Check `JWT_SECRET` — exits with an error if missing (fail-fast, no silent misconfiguration)
2. `connectDB()` — Mongoose connects to MongoDB Atlas
3. `initializeFirebase()` — Firebase Admin SDK initialized with service account credentials
4. `connectRedis()` — Redis client connects to Redis Cloud
5. `createServer(app)` + `new Server(io)` — HTTP server and Socket.IO server share the same port
6. `registerSocketHandlers(io)` — attach all Socket.IO event listeners
7. `server.listen(PORT)` — start accepting requests

If any step throws, the process exits rather than silently serving partial functionality.

---

### Middleware stack

Middleware runs in registration order. The order matters:

#### Monolith (`src/app.ts`)

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | `helmet()` | Sets security HTTP headers (X-Frame-Options, CSP, etc.) |
| 2 | `compression()` | Gzip response bodies |
| 3 | `rateLimit()` | 100 requests/min per IP on all `/v1/api` routes |
| 4 | `authLimiter()` | Stricter: 50 requests/30 min per IP on `/auth/login` and `/auth/register` |
| 5 | `cors()` | Allows configured origins with `credentials: true` |
| 6 | `cookieParser()` | Parses the `token` httpOnly cookie from the request |
| 7 | `express.json()` | Parses request body as JSON (1 MB limit) |
| **8** | **`createProxyMiddleware()`** | **Intercepts `/v1/api/expenses/**` — forwards to expense-service** |
| 9 | `morgan()` | HTTP request logging (`dev` in development, `combined` in production) |
| 10 | `routes` | All monolith routes (`/auth`, `/users`, `/conversations`, `/health`) |
| 11 | `errorHandler` | Catches errors thrown by controllers |
| 12 | 404 handler | Returns HTML or JSON depending on `Accept` header |

#### Expense Service (`services/expense-service/src/app.ts`)

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | `helmet()` | Security headers |
| 2 | `cors()` | Same origin policy, credentials: true |
| 3 | `cookieParser()` | Reads cookie forwarded by the proxy |
| 4 | `express.json()` | Parse body |
| 5 | `morgan()` | Request logging |
| 6 | `auth` (per-route) | JWT verify from `shared-auth` package — no DB lookup, claims trusted from token |
| 7 | Controller | Validate → service → Prisma → PostgreSQL |
| 8 | `errorHandler` | Prisma errors mapped to HTTP status codes |

---

### Auth flow (`POST /v1/api/auth/login`)

```
Client
  │
  │  POST /v1/api/auth/login  { email, password }
  ▼
authLimiter  ──  > 50 req/30min from this IP?  ──▶  429 Too Many Requests
  │
  ▼
auth_controller.ts → auth_service.ts
  │  1. User.findOne({ email })  →  MongoDB
  │  2. bcrypt.compare(password, user.password)
  │  3. jwt.sign({ userId, username, email }, JWT_SECRET, { expiresIn: '15d' })
  ▼
res.cookie('token', jwt, {
  httpOnly: true,       // JS cannot read it — XSS protection
  secure: true,         // HTTPS only
  sameSite: 'none',     // required: client (Vercel) and API (Render) are cross-origin
  maxAge: 15 days
})
  │
  ▼
Client browser stores cookie automatically.
All subsequent requests attach it automatically.
```

**Why `SameSite=None`?**
The client is on `vercel.app` and the API is on `onrender.com`. Browsers block `SameSite=Lax` cookies on cross-origin requests (XHR/fetch). `None; Secure` is the only value that allows them — and it requires HTTPS.

---

### Protected REST request flow

Example: `GET /v1/api/users`

```
Client
  │
  │  GET /v1/api/users  (cookie: token=<jwt>)
  ▼
rateLimit  ──  check IP
  │
  ▼
cors  ──  check Origin header against allowed list
  │
  ▼
cookieParser  ──  extracts token from Cookie header
  │
  ▼
auth middleware (src/middleware/auth.ts)
  │
  │  1. Read req.cookies.token
  │  2. jwt.verify(token, JWT_SECRET)  ──  invalid/expired?  ──▶  401
  │  3. Redis GET user:{userId}
  │       hit?  ──▶  use cached user (TTL 60s)
  │       miss? ──▶  MongoDB.findById(userId).select('-password')
  │                  ──▶  Redis SETEX user:{userId} 60 <json>
  │  4. req.user = user
  ▼
users_controller.ts
  │  queries MongoDB, transforms data
  ▼
res.json({ success: true, data: [...] })
```

The Redis cache avoids a MongoDB round trip on every request for any user who has been active in the last 60 seconds.

---

### Expense proxy flow

Example: `GET /v1/api/expenses/categories`

```
Client
  │
  │  GET /v1/api/expenses/categories  (cookie: token=<jwt>)
  ▼
Monolith app.ts — proxy middleware matches /v1/api/expenses
  │
  │  Express strips the mount path → remaining path = /categories
  │  pathRewrite: { '^/': '/v1/api/expenses/' }
  │  rewrites /categories  →  /v1/api/expenses/categories
  │
  │  Forwards to:  https://expense-service-8i5i.onrender.com/v1/api/expenses/categories
  │  - All original headers forwarded (including Cookie, Accept, etc.)
  │  - changeOrigin: true  (rewrites Host header to match target)
  │  - xfwd: true  (adds X-Forwarded-For, X-Forwarded-Host headers)
  ▼
Expense Service
  │
  │  cookieParser  ──  reads forwarded token cookie
  │
  │  auth middleware (from shared-auth package)
  │    jwt.verify(token, JWT_SECRET)
  │    req.user = { userId, email, username }  ← from token claims directly
  │    (no MongoDB or Redis — expense-service has no user store)
  │
  ▼
expense_controller.ts → expense_service.ts
  │  prisma.expenseCategory.findMany()
  ▼
Expense Service sends JSON response
  │
  ▼
Proxy streams response back to client
  │
  ▼
Client receives:  { success: true, data: [{ id, name, description }, ...] }
```

**Key point:** The cookie is forwarded untouched by the proxy. Both services share the same `JWT_SECRET`, so the expense-service can verify the token independently without contacting the monolith.

---

### Socket.IO real-time flow

```
Client
  │
  │  WebSocket upgrade  (cookie: token=<jwt>)
  ▼
Socket.IO handshake guard  (io.use())
  │  Reads token from:
  │    1. Cookie header  (cookie: token=xxx)
  │    2. handshake.auth.token  (fallback for non-browser clients)
  │  jwt.verify(token, JWT_SECRET)
  │       invalid?  ──▶  connection rejected with Error('Invalid token')
  │  socket.data.userId = decoded.userId
  │  socket.data.username = decoded.username
  ▼
io.on('connection')
  │
  │  Register presence in Redis:
  │    HSET connectedUsers  <socketId>  { id, username, userId, socketId, isOnline }
  │    HSET userSockets     <userId>    <socketId>
  │  Update MongoDB:
  │    User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: now })
  │
  ├── Event: sendDirectMessage  { recipientId, message, messageType? }
  │     │
  │     │  1. Find or create Conversation where participants includes [senderId, recipientId]
  │     │  2. Message.create({ conversation, sender, content, messageType })
  │     │  3. Conversation.updateOne({ lastMessage, updatedAt })
  │     │  4. Redis HGET userSockets <recipientId>  →  get recipient's socketId
  │     │     if online  →  io.to(socketId).emit('newDirectMessage', message)
  │     │     if offline →  fcm_service.sendPushNotification(recipientFcmToken, data)
  │     │  5. socket.emit('messageSent', message)  ← confirm to sender
  │
  ├── Event: typing  →  broadcast typing indicator to conversation participants
  │
  ├── Event: markAsRead  →  Message.updateMany({ readBy: push userId })
  │
  └── disconnect
        Redis HDEL connectedUsers <socketId>
        Redis HDEL userSockets <userId>
        User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: now })
        socket.broadcast.emit('userOffline', { userId })
```

---

## API Routes

### Monolith — `https://messaging-socket.onrender.com/v1/api`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Login, sets cookie |
| POST | `/auth/logout` | ✓ | Clears cookie |
| GET | `/auth/user` | ✓ | Current user profile |
| PUT | `/auth/fcmtoken` | ✓ | Update FCM push token |
| GET | `/users` | ✓ | List all users |
| GET | `/users/friends` | ✓ | Friend list |
| GET | `/users/friendrequest` | ✓ | Pending requests |
| POST | `/users/addfriend` | ✓ | Send friend request |
| PUT | `/users/confirm_request` | ✓ | Accept friend request |
| PUT | `/users/avatar` | ✓ | Upload avatar |
| GET | `/conversations/:friend_id/messages` | ✓ | Message history |
| GET | `/health` | — | Health check |

### Expense Service — proxied via monolith at `/v1/api/expenses`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | ✓ | All 11 expense categories |
| GET | `/summary` | ✓ | Totals grouped by `day` or `category` |
| POST | `/` | ✓ | Create expense |
| GET | `/` | ✓ | List expenses (paginated, filterable) |
| GET | `/:id` | ✓ | Get single expense |
| PUT | `/:id` | ✓ | Update expense |
| DELETE | `/:id` | ✓ | Delete expense |
| GET | `/health` | — | Health check |

**Query params for `GET /expenses`:** `startDate`, `endDate`, `category`, `page`, `limit`  
**Query params for `GET /expenses/summary`:** `startDate`, `endDate`, `groupBy` (`day` | `category`)

---

## Data Models

### MongoDB (Monolith)

**User**
```
_id         ObjectId    PK
username    String      unique
email       String      unique
password    String      bcrypt hash (never returned in responses)
avatar      String?     URL
isOnline    Boolean     updated on socket connect/disconnect
lastSeen    Date
fcmToken    String?     Firebase Cloud Messaging token for push notifications
createdAt   Date
```

**Message**
```
_id           ObjectId    PK
conversation  ObjectId    → Conversation
sender        ObjectId    → User
content       String
messageType   String      "text" | "image" | "file"
readBy        ObjectId[]  users who have read this message
createdAt     Date
```

**Conversation**
```
_id           ObjectId    PK
participants  ObjectId[]  exactly 2 users (direct message)
lastMessage   ObjectId?   → Message
updatedAt     Date        updated on each new message
```

**Friend**
```
_id       ObjectId    PK
requester ObjectId    → User
recipient ObjectId    → User
status    String      "pending" | "accepted" | "rejected"
```

### PostgreSQL (Expense Service via Prisma)

**ExpenseCategory**
```
id           UUID        PK
name         String      unique  (FOOD | TRANSPORT | HOUSING | UTILITIES |
                                  HEALTHCARE | ENTERTAINMENT | SHOPPING |
                                  EDUCATION | TRAVEL | SAVINGS | OTHER)
description  String?
```

**Expense**
```
id             UUID         PK
userId         String       from JWT claim (no FK to a user table)
amount         Decimal(12,2)
currency       Char(3)      default "MMK"
categoryId     UUID         → ExpenseCategory
paymentMethod  Enum         CASH | KBZ_PAY | AYA_PAY | ONLINE_PAYMENT  (default CASH)
description    String?      max 500 chars
spentAt        Date         date of the expense (not timestamp)
createdAt      DateTime     auto
updatedAt      DateTime     auto-updated

Indexes:
  (userId, spentAt)    — for date-range queries
  (userId, categoryId) — for category filter queries
```

### Redis (In-memory)

| Key | Type | Value | TTL |
|-----|------|-------|-----|
| `user:{userId}` | String | JSON user object | 60s |
| `connectedUsers` | Hash | `socketId → userEntry JSON` | none |
| `userSockets` | Hash | `userId → socketId` | none |

---

## Environment Variables

### Monolith (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | no | Default `1500` |
| `NODE_ENV` | yes | `development` / `golive` / `production` |
| `JWT_SECRET` | **yes** | Must match across all services |
| `JWT_EXPIRES_IN` | no | Default `15d` |
| `MONGODB_URI` | **yes** | MongoDB Atlas connection string |
| `REDIS_URL` | **yes** | Redis Cloud host |
| `REDIS_PASSWORD` | **yes** | Redis password |
| `REDIS_PORT` | **yes** | Redis port |
| `CLIENT_URL` | **yes** | Allowed CORS origins (comma-separated) |
| `EXPENSE_SERVICE_URL` | **yes** | Expense service base URL for proxy |
| `FIREBASE_PROJECT_ID` | yes | Firebase project |
| `FIREBASE_PRIVATE_KEY` | yes | Firebase service account key |
| `FIREBASE_CLIENT_EMAIL` | yes | Firebase service account email |

### Expense Service (`services/expense-service/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | no | Default `4004` |
| `DATABASE_URL` | **yes** | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | **yes** | Must be identical to monolith |
| `CLIENT_URL` | yes | Allowed CORS origins |

> **Critical:** `JWT_SECRET` must be byte-identical in every service. The expense-service verifies tokens signed by the monolith — if the secrets differ, all expense requests return 401.

---

## Getting Started

### Monolith only

```bash
npm install
cp .env.example .env    # fill in MONGODB_URI, JWT_SECRET, REDIS_*, FIREBASE_*
# add EXPENSE_SERVICE_URL=https://expense-service-8i5i.onrender.com (or local)
npm run dev             # ts-node-dev on localhost:1500
```

### With expense service locally

```bash
npm install
cp services/expense-service/.env.example services/expense-service/.env
# set DATABASE_URL and JWT_SECRET (must match monolith)
npm run dev -w services/expense-service   # localhost:4004
npm run dev                               # localhost:1500 (with proxy to :4004)
```

### Seed expense categories

```bash
cd services/expense-service
npm run prisma:seed
```

### Full stack (Docker)

```bash
docker compose up -d --build
```

---

## Deployment

Production is Render.com. See `render.yaml` for the Blueprint config.

**Monolith service (`messaging-socket`)**
- Build: `npm install && npm run build`
- Start: `npm start`
- Required env vars: all variables listed above including `EXPENSE_SERVICE_URL`

**Expense service (`expense-service`)**
- Build: `npm install && npx prisma generate && npm run build`
- Start: `npx prisma migrate deploy && npm start`
- Required env vars: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`

After deploying, verify:
```bash
curl https://messaging-socket.onrender.com/v1/api/health
curl https://expense-service-8i5i.onrender.com/v1/api/health
curl https://messaging-socket.onrender.com/v1/api/expenses/categories  # should proxy correctly
```

---

## License

Apache License
