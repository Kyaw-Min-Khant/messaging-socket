# Messaging Socket Data Model

The app keeps data in three stores. The monolith owns users, chat and friends in MongoDB. The expense service owns money data in PostgreSQL. Redis holds short-lived presence and auth cache. The stores share one key: the Mongo `User._id`, which Postgres stores as a plain `user_id` string with no foreign key.

## How the stores connect

```mermaid
flowchart LR
  C[Client :3000] --> G[Gateway]
  G -->|/v1/api/expenses/**| E[expense-service :4004]
  G -->|everything else + socket.io| M[Monolith :1500]
  M --> MG[(MongoDBusers, chat, friends)]
  M --> R[(Redispresence, auth cache)]
  E --> PG[(PostgreSQLexpenses, budgets, income)]
  PG -. "user_id = User._id (JWT userId)" .-> MG
```

## MongoDB

Mongoosesrc/models/\*.ts

```mermaid
erDiagram
  User ||--o{ Friend : "requester"
  User ||--o{ Friend : "receiver"
  User }|--o{ Conversation : "participants (exactly 2)"
  Conversation ||--o{ Message : "contains"
  User ||--o{ Message : "sender"
  Conversation |o--o| Message : "lastMessage"
  User ||--o{ Room : "createdBy"
  User }o--o{ Room : "members / admins"
  Room |o--o| Message : "lastMessage"

  User {
    ObjectId _id PK
    string username UK "3-30 chars"
    string email UK "lowercase"
    string password "bcrypt hash"
    string avatar
    string fcmtoken
    boolean isOnline "indexed"
    Date lastSeen
    Date createdAt
    Date updatedAt
  }
  Friend {
    ObjectId _id PK
    ObjectId requester FK "User"
    ObjectId receiver FK "User"
    string status "pending | accepted | blocked"
  }
  Conversation {
    ObjectId _id PK
    ObjectId_array participants FK "User x2"
    ObjectId lastMessage FK "Message"
    Map unreadCount "userId to count"
    Date createdAt
    Date updatedAt
  }
  Message {
    ObjectId _id PK
    ObjectId sender FK "User"
    ObjectId conversation FK "Conversation"
    string content "max 1000"
    string messageType "text | image | audio | file"
    string fileUrl "required unless text"
    string fileName
    number fileSize
    string status "sent | delivered | seen"
    Date deliveredAt
    Date seenAt
    Date createdAt
  }
  Room {
    ObjectId _id PK
    string name "3-50 chars"
    string description "max 200"
    boolean isPrivate
    ObjectId createdBy FK "User"
    ObjectId_array members FK "User"
    ObjectId_array admins FK "User"
    ObjectId lastMessage FK "Message"
    Date createdAt
    Date updatedAt
  }
```

### Indexes

- **users** username, email (unique), isOnline
- **conversations** participants, participants.0 + participants.1, lastMessage
- **messages** conversation + createdAt desc, sender, status
- **rooms** name, members, isPrivate
- **friends** none besides \_id

### Rules in code

- **Conversation** pre-save rejects anything but 2 unique participants
- **Conversation** findOrCreateConversation sorts the 2 ids so lookup is stable
- **User** pre-save hashes password (bcrypt, cost 12)
- **User** JWT payload: userId, email, username

## PostgreSQL

Prismaservices/expense-service/prisma/schema.prisma

```mermaid
erDiagram
  expense_categories ||--o{ expenses : "category_id"
  expense_categories |o--o{ budgets : "category_id (null = overall), cascade"
  expense_categories ||--o{ recurring_expenses : "category_id"
  recurring_expenses |o--o{ expenses : "recurring_id, set null"

  expense_categories {
    uuid id PK
    string user_id "null = global seeded"
    varchar100 name "unique per user_id"
    varchar500 description
    timestamp created_at
    timestamp updated_at
  }
  expenses {
    uuid id PK
    string user_id "Mongo User._id"
    decimal12_2 amount
    char3 currency "default MMK"
    uuid category_id FK
    PaymentMethod payment_method "CASH | KBZ_PAY | AYA_PAY | ONLINE_PAYMENT"
    varchar500 description
    date spent_at
    uuid recurring_id FK "nullable"
    timestamp created_at
    timestamp updated_at
  }
  budgets {
    uuid id PK
    string user_id "Mongo User._id"
    uuid category_id FK "nullable"
    decimal12_2 amount "monthly limit"
    char3 currency
    timestamp created_at
    timestamp updated_at
  }
  incomes {
    uuid id PK
    string user_id "Mongo User._id"
    decimal12_2 amount
    char3 currency
    varchar100 source
    varchar500 description
    date received_at
    timestamp created_at
    timestamp updated_at
  }
  recurring_expenses {
    uuid id PK
    string user_id "Mongo User._id"
    decimal12_2 amount
    char3 currency
    uuid category_id FK
    PaymentMethod payment_method
    varchar500 description
    RecurringFrequency frequency "DAILY | WEEKLY | MONTHLY | YEARLY"
    date start_date
    date end_date "nullable"
    date next_run_at
    boolean active
    timestamp created_at
    timestamp updated_at
  }
```

### Indexes and constraints

- **expenses** (user_id, spent_at), (user_id, category_id)
- **expense_categories** unique (user_id, name), plus partial unique name WHERE user_id IS NULL
- **budgets** unique (user_id, category_id), plus partial unique user_id WHERE category_id IS NULL
- **incomes** (user_id, received_at)
- **recurring_expenses** (user_id, active, next_run_at)

### Rules in code

- **categories** a user sees global rows plus their own; only their own can be edited
- **budgets** warning at 80% used, flagged when exceeded
- **recurring** due expenses are created on read; next_run_at guard stops duplicates
- **all tables** every query filters by user_id from the JWT

## Redis

node-redissrc/socket/index.ts, src/middleware/auth.ts

### connectedUsers

- **hash** socket.id → user entry JSON. Set on connect, removed on disconnect.

### userSockets

- **hash** userId → socket.id. Used to route private messages and read receipts.

### user:{userId}

- **string** cached user for the auth middleware, with expiry. Deleted when the user changes.

## Things the schema doesn't enforce

**Friend has no timestamps.** The interface declares `createdAt` and `updatedAt`, but the schema has no `{ timestamps: true }`, so they are never saved.

**Duplicate friend requests are possible.** There is no unique index on `(requester, receiver)`, and nothing stops A→B and B→A both existing.

**Room messages have nowhere to live.** `Room.lastMessage` points at Message, but `Message.conversation` is required and there is no `room` field.

**No cross-database cleanup.** Deleting a Mongo user leaves their Postgres rows behind, because `user_id` is not a real foreign key.

**One socket per user.** `userSockets` stores a single socket.id, so a second tab or device replaces the first.