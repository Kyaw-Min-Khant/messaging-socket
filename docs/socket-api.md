# Socket.IO API

Real-time events are served by **socket-go** (`services/socket-go`, Go). Clients always connect through the **gateway**, which proxies `/socket.io` and adds the `X-Internal-Secret` header that socket-go requires.

Event names and payload shapes are the client contract. The handlers live in `services/socket-go/internal/socket/handlers.go`.

## Connection

```javascript
import { io } from 'socket.io-client';

// Production: the gateway origin. Local dev with Vite: "/" (Vite proxies /socket.io).
const socket = io('https://<gateway-host>', { withCredentials: true });
```

### Authentication

The JWT is checked during the handshake, before the connection is accepted. socket-go reads it from:

1. the `token` cookie set by `POST /v1/api/auth/login` (browsers, with `withCredentials: true`), or
2. `handshake.auth.token` (mobile and other non-browser clients):

```javascript
const socket = io('https://<gateway-host>', { auth: { token: '<jwt>' } });
```

If both are present, the cookie wins. The token must be HS256, signed with `JWT_SECRET`, and contain `userId`.

A rejected handshake arrives as `connect_error`:

| `err.message` | Cause |
|---|---|
| `Authentication required` | No token in the cookie or `auth.token` |
| `Invalid token` | Bad signature, expired, wrong algorithm, or no `userId` |

```javascript
socket.on('connect_error', (err) => console.error(err.message));
```

A connection made straight to socket-go (`:1600`), without the gateway, is refused with HTTP 403 whenever `INTERNAL_SECRET` is set.

### What happens on connect

- The socket joins a room named after the user's `userId`. Every tab and device of a user sits in that room, so events sent to the user reach all of them.
- Redis: `HSET connectedUsers <socketId> <entry JSON>`.
- MongoDB: the user's `isOnline` is set to `true` and `lastSeen` to now.

No event is broadcast on connect. `userOnline` is only sent when the client emits `authenticate` (see below).

## Client → server events

### `sendDirectMessage`

Saves a direct message and delivers it.

```javascript
socket.emit('sendDirectMessage', {
  recipientId: '665f1c…',   // required, Mongo User _id
  message: 'Hello!',        // required, 1–1000 characters after trimming
  messageType: 'text',      // optional, default "text"
});
```

Server behaviour:

1. Finds the conversation between sender and recipient, or creates it.
2. Inserts the message with status `sent`.
3. If the recipient has any connected socket, emits `newDirectMessage` to them (status `delivered`) and updates the stored status to `delivered`.
4. Emits `messageSent` back to the sender.
5. If the recipient is offline and has an FCM token, sends a push notification.

Only `text` works over the socket. `image`, `audio` and `file` require a `fileUrl`, which this event cannot carry, so they fail validation with `error`.

Errors (emitted as `error`): `Invalid recipient` when `recipientId` is missing or empty, and `Failed to send message` for validation or database failures.

### `typing`

Relays a typing indicator. Nothing is stored.

```javascript
socket.emit('typing', { recipientId: '665f1c…', isTyping: true });
```

The recipient receives `userTyping`. A missing `recipientId` returns `error` `Invalid recipient`.

### `markAsRead`

Marks a message as seen.

```javascript
socket.emit('markAsRead', { messageId: '6660aa…', senderId: '665f1c…' });
```

The message's `status` becomes `seen`, and `seenAt` is set. If `senderId` is given, the original sender receives `messageRead`. Failures are logged on the server; no `error` is sent to the client.

### `authenticate` (legacy)

Kept for older clients. The payload is ignored, because identity comes from the handshake.

```javascript
socket.emit('authenticate');
```

The caller receives `authenticated`, and every other connected socket receives `userOnline`.

## Server → client events

### `authenticated`

Reply to `authenticate`.

```javascript
{ user: { id: string, username: string } }
```

### `messageSent`

Sent to the sender after the message is saved.

```javascript
{
  _id: string,             // message id
  conversationId: string,
  senderId: string,
  senderUsername: string,
  recipientId: string,
  message: string,         // the text as sent (untrimmed)
  messageType: string,
  timestamp: string,       // ISO 8601, e.g. "2026-10-15T08:30:00.000Z"
  status: 'sent'
}
```

### `newDirectMessage`

Sent to every socket of an online recipient. Same shape as `messageSent`, with `status: 'delivered'`.

### `userTyping`

```javascript
{ senderId: string, senderUsername: string, isTyping: boolean }
```

### `messageRead`

Sent to the original sender after the recipient emits `markAsRead`.

```javascript
{ messageId: string, readBy: string, readAt: string }
```

### `userOnline`

Broadcast to everyone except the caller when a client emits `authenticate`.

```javascript
{ id: string, username: string, isOnline: true }
```

### `userOffline`

Broadcast when a user's **last** socket disconnects. Closing one of several tabs does not trigger it.

```javascript
{ id: string, username: string, isOnline: false, lastSeen: string }
```

On that last disconnect, MongoDB `isOnline` is set to `false` and `lastSeen` is updated. Each disconnecting socket is also removed from the Redis `connectedUsers` hash.

### `error`

```javascript
{ message: string }   // "Invalid recipient" | "Failed to send message"
```

## Message status

| Status | Set when |
|---|---|
| `sent` | The message is saved |
| `delivered` | The recipient was online when it was sent |
| `seen` | The recipient emitted `markAsRead` |

A message sent while the recipient is offline stays `sent` until it is marked `seen`.

## Message types

`text` (default), `image`, `audio`, `file`. Only `text` can be sent over the socket; see `sendDirectMessage`.

## Complete example

```javascript
import { io } from 'socket.io-client';

const socket = io('/', { withCredentials: true });   // cookie from /v1/api/auth/login

socket.on('connect_error', (err) => console.error('Auth failed:', err.message));
socket.on('error', (err) => console.error('Socket error:', err.message));

socket.on('connect', () => {
  socket.emit('sendDirectMessage', { recipientId: friendId, message: 'Hello!' });
});

socket.on('messageSent', (msg) => console.log('Saved', msg._id, msg.status));

socket.on('newDirectMessage', (msg) => {
  console.log(`${msg.senderUsername}: ${msg.message}`);
  socket.emit('markAsRead', { messageId: msg._id, senderId: msg.senderId });
});

socket.on('userTyping', ({ senderUsername, isTyping }) => {
  if (isTyping) console.log(`${senderUsername} is typing…`);
});

socket.on('messageRead', ({ messageId, readAt }) => console.log(messageId, 'seen at', readAt));
socket.on('userOffline', ({ username }) => console.log(`${username} went offline`));
```
