# Messaging App — Web Client

React + Vite web client for the real-time messaging backend. Communicates over REST (Axios) and WebSockets (Socket.IO), with httpOnly cookie-based authentication and Firebase web push notifications.

---

## Tech Stack

| Category | Package | Purpose |
|---|---|---|
| Framework | `react` 18 | UI rendering |
| Build tool | `vite` 5 | Dev server, HMR, bundling |
| Language | `typescript` 5 | Type safety |
| Styling | `tailwindcss` 3 | Utility-first CSS |
| Routing | `react-router-dom` 6 | Client-side navigation |
| HTTP client | `axios` 1.6 | REST API calls (with credentials) |
| WebSocket | `socket.io-client` 4.7 | Real-time messaging |
| Date formatting | `date-fns` 3 | Human-readable timestamps |
| Notifications | `react-hot-toast` 2.4 | In-app toast alerts |
| Emoji picker | `emoji-picker-react` 4 | Emoji insertion in chat input |
| Push notifications | `firebase` 12 | FCM web push (foreground + background) |

---

## Project Structure

```
client/
├── public/
│   └── firebase-messaging-sw.js   # Service worker — handles background push notifications
├── src/
│   ├── api/                       # All HTTP calls to the backend
│   │   ├── client.ts              # Axios instance (baseURL, withCredentials, 401 interceptor)
│   │   ├── auth.ts                # login, register, getCurrentUser, logout
│   │   ├── users.ts               # friends, friend requests, add friend, update avatar
│   │   └── messages.ts            # fetch message history, normalize DB → socket format
│   ├── components/                # Reusable UI components
│   │   ├── Sidebar.tsx            # Friend list, tabs (Chats / Requests / Add), search
│   │   ├── ChatWindow.tsx         # Message list, emoji picker, typing indicator, input
│   │   ├── MessageBubble.tsx      # Single message with status icons (sent/delivered/seen)
│   │   ├── FriendRequests.tsx     # Pending friend request list with accept button
│   │   └── AddUsers.tsx           # Search and add new friends
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Global auth state, FCM token refresh, foreground messages
│   │   └── SocketContext.tsx      # Socket.IO connection, online/offline user tracking
│   ├── hooks/
│   │   └── useMessages.ts         # Message state, real-time events, send, typing, read receipts
│   ├── lib/
│   │   └── firebase.ts            # Firebase init, getWebFCMToken(), onForegroundMessage()
│   ├── pages/
│   │   ├── Login.tsx              # Login form
│   │   ├── Register.tsx           # Registration form
│   │   ├── Chat.tsx               # Main layout: Sidebar + ChatWindow
│   │   └── Profile.tsx            # User profile + avatar picker
│   ├── types/
│   │   └── index.ts               # Shared TypeScript interfaces
│   ├── App.tsx                    # BrowserRouter, routes, ProtectedRoute, PublicRoute
│   ├── main.tsx                   # React root mount
│   └── index.css                  # Tailwind directives
├── .env                           # Local env vars (create from .env.example)
├── .env.example                   # Env var template
├── vite.config.ts                 # Dev server, proxy to backend, port 3000
├── tailwind.config.js
└── package.json
```

---

## Architecture & Data Flow

### Authentication

```
Browser                     Vite Dev Server (3000)          Express Backend (1500)
  │                               │                               │
  │── POST /v1/api/auth/login ──► │── proxy ──────────────────► │
  │                               │                               │ sets httpOnly cookie
  │◄─────────────────────────────────────────────────────────── │
  │
  │  All subsequent requests automatically include the cookie.
  │  The frontend never sees or stores the JWT — the browser handles it.
```

1. User submits login → `login()` in `api/auth.ts` calls `getWebFCMToken()` first (requests browser notification permission and retrieves the FCM token)
2. Credentials + FCM token sent to `POST /v1/api/auth/login`
3. Backend sets an `httpOnly` JWT cookie in the response — frontend cannot read it
4. `AuthContext` calls `GET /v1/api/auth/user` on every app load to restore session
5. On 401, the Axios interceptor redirects to `/login` (except during the session-check call)

### Real-time Messaging

```
AuthContext (user present)
  └── SocketProvider mounts
        └── io('/', { withCredentials: true })   ← cookie sent on WS handshake
              │
              ├── connect / disconnect  → updates `connected` state
              ├── userOnline / userOffline → updates `onlineUsers` Map
              │
              └── ChatWindow mounts
                    └── useMessages(friendId, socket, userId)
                          ├── fetches history via GET /v1/api/messages/:friendId
                          ├── socket.on('newDirectMessage')  → appends + emits markAsRead
                          ├── socket.on('messageSent')       → appends own message
                          ├── socket.on('userTyping')        → shows typing indicator
                          └── socket.on('messageRead')       → updates bubble to "seen"
```

### Push Notifications (Web)

```
Tab visible (foreground)
  └── onForegroundMessage() → react-hot-toast notification

Tab hidden / closed (background)
  └── firebase-messaging-sw.js (service worker)
        └── messaging.onBackgroundMessage() → showNotification() (OS native)
```

FCM token is refreshed automatically — `AuthContext` calls `PUT /v1/api/auth/fcmtoken` whenever the logged-in user changes, keeping the stored token current even after Firebase rotates it.

---

## Features

### Auth
- Register with username, email, password
- Login — browser notification permission requested, FCM token stored
- Persistent session via httpOnly cookie (survives page reload)
- Auto redirect: unauthenticated → `/login`, authenticated → `/`

### Friends
- **Friend list** — shows all accepted friends with online status indicator
- **Search** — filter friends by username in real time
- **Add users** — find users not yet connected, send friend request
- **Friend requests** — accept pending requests; badge count shown on tab

### Messaging
- Real-time direct messages over Socket.IO
- **Message history** loaded on conversation open (paginated from DB)
- **Typing indicator** — animated dots appear when the other user is typing, auto-clears after 3 s
- **Read receipts** — `sent` → `delivered` → `seen` status on each bubble
- **Emoji picker** — dark-themed emoji panel with cursor-aware insertion
- Auto-scroll to latest message; textarea auto-focuses on friend change
- `Enter` to send, `Shift+Enter` for new line

### Profile
- View username, email, member since, last seen
- **Avatar picker** — choose from 6 preset profile pictures; updates DB and sidebar instantly

### Push Notifications
- **Foreground** — toast notification when a message arrives while the tab is active
- **Background** — OS-level notification via service worker when tab is hidden or closed
- Notification click focuses the existing tab or opens a new one

---

## Setup

### 1. Install dependencies

```bash
cd client
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your Firebase Web App config:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

Get these from:
- **API key → App ID**: Firebase Console → Project Settings → Your apps → Web app
- **VAPID key**: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair

### 3. Update the service worker

Open `public/firebase-messaging-sw.js` and replace the 5 `REPLACE_WITH_...` placeholder strings with the same values from your Firebase Web App config (service workers cannot read `import.meta.env`).

### 4. Run the dev server

```bash
npm run dev
```

The app runs at `http://localhost:3000`. API and WebSocket calls are proxied to `http://localhost:1500` (the backend) — no CORS issues in development.

To share on the local network, open `http://<your-local-ip>:3000` from any device on the same network (the Vite dev server binds to `0.0.0.0`).

### 5. Build for production

```bash
npm run build
```

Output goes to `dist/`. Serve it behind a reverse proxy (nginx, Caddy) that also forwards `/v1/api` and `/socket.io` to the backend.

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web App API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain (`<project>.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID |
| `VITE_FIREBASE_VAPID_KEY` | VAPID public key for Web Push |

---

## Key Design Decisions

**httpOnly cookies over localStorage** — The JWT is set by the backend and never accessible to JavaScript. This prevents XSS attacks from stealing auth tokens. The browser sends the cookie automatically on every request and WebSocket handshake.

**Vite proxy** — All API and Socket.IO traffic goes through `/v1/api` and `/socket.io` on the same origin (`localhost:3000`). This avoids CORS entirely in development and makes the production deployment configuration straightforward.

**API normalization layer** — The backend returns MongoDB `_id` fields and inconsistent response shapes. The `api/` layer normalizes everything to `id` and consistent types before the rest of the app sees it, so components always work with clean data.

**SocketContext only mounts when authenticated** — `SocketProvider` wraps only the protected `/` route. The socket connects only when a user is present and disconnects on logout, preventing stale connections.
