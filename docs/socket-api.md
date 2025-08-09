# Socket.IO API Documentation

## Connection

Connect to the Socket.IO server:

```javascript
const socket = io('http://localhost:1500');
```

## Events

### Client to Server Events

#### `authenticate`
Authenticate user and join online users list.

**Payload:**
```javascript
{
  username: string,
  userId?: string
}
```

**Example:**
```javascript
socket.emit('authenticate', { username: 'john_doe' });
```

#### `sendDirectMessage`
Send a direct message to a specific user.

**Payload:**
```javascript
{
  recipientId: string,
  message: string,
  conversationId?: string,
  messageType?: string,
  userId?: string
}
```

**Example:**
```javascript
socket.emit('sendDirectMessage', {
  recipientId: 'user123',
  message: 'Hello! How are you?',
  messageType: 'text'
});
```

#### `typing`
Send typing indicator to recipient.

**Payload:**
```javascript
{
  recipientId: string,
  isTyping: boolean
}
```

**Example:**
```javascript
socket.emit('typing', { recipientId: 'user123', isTyping: true });
```

#### `markAsRead`
Mark a message as read.

**Payload:**
```javascript
{
  messageId: string,
  senderId: string
}
```

**Example:**
```javascript
socket.emit('markAsRead', {
  messageId: 'msg123',
  senderId: 'user123'
});
```

### Server to Client Events

#### `authenticated`
Confirmation of successful authentication.

**Payload:**
```javascript
{
  user: {
    id: string,
    username: string
  },
  onlineUsers: [
    {
      id: string,
      username: string,
      isOnline: boolean,
      socketId: string
    }
  ]
}
```

**Example:**
```javascript
socket.on('authenticated', (data) => {
  console.log('Authenticated as:', data.user.username);
  console.log('Online users:', data.onlineUsers);
});
```

#### `newDirectMessage`
New message received.

**Payload:**
```javascript
{
  id: string,
  senderId: string,
  senderUsername: string,
  recipientId: string,
  conversationId: string,
  message: string,
  messageType: string,
  timestamp: string,
  status: string
}
```

**Example:**
```javascript
socket.on('newDirectMessage', (message) => {
  console.log(`New message from ${message.senderUsername}:`, message.message);
});
```

#### `userOnline`
User came online.

**Payload:**
```javascript
{
  id: string,
  username: string,
  isOnline: boolean
}
```

**Example:**
```javascript
socket.on('userOnline', (user) => {
  console.log(`${user.username} is now online`);
});
```

#### `userOffline`
User went offline.

**Payload:**
```javascript
{
  id: string,
  username: string,
  isOnline: boolean,
  lastSeen: string
}
```

**Example:**
```javascript
socket.on('userOffline', (user) => {
  console.log(`${user.username} is now offline`);
});
```

#### `userTyping`
User is typing.

**Payload:**
```javascript
{
  senderId: string,
  senderUsername: string,
  isTyping: boolean
}
```

**Example:**
```javascript
socket.on('userTyping', (data) => {
  if (data.isTyping) {
    console.log(`${data.senderUsername} is typing...`);
  }
});
```

#### `messageRead`
Message was read.

**Payload:**
```javascript
{
  messageId: string,
  readBy: string,
  readAt: string
}
```

**Example:**
```javascript
socket.on('messageRead', (data) => {
  console.log(`Message ${data.messageId} was read at ${data.readAt}`);
});
```

#### `error`
Error occurred.

**Payload:**
```javascript
{
  message: string
}
```

**Example:**
```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
});
```

## Complete Example

```javascript
const socket = io('http://localhost:1500');

// Authenticate
socket.emit('authenticate', { username: 'john_doe' });

// Listen for authentication
socket.on('authenticated', (data) => {
  console.log('Authenticated as:', data.user.username);
  
  // Select a user to chat with
  const recipient = data.onlineUsers[0];
  if (recipient) {
    // Send a message
    socket.emit('sendDirectMessage', {
      recipientId: recipient.id,
      message: 'Hello!'
    });
  }
});

// Listen for new messages
socket.on('newDirectMessage', (message) => {
  console.log(`Message from ${message.senderUsername}:`, message.message);
});

// Listen for user status changes
socket.on('userOnline', (user) => {
  console.log(`${user.username} came online`);
});

socket.on('userOffline', (user) => {
  console.log(`${user.username} went offline`);
});

// Handle errors
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
});
```

## Message Types

- `text` - Plain text message (default)
- `image` - Image message
- `audio` - Audio message
- `file` - File message

## Status Values

- `sent` - Message sent to server
- `delivered` - Message delivered to recipient
- `read` - Message read by recipient

## Error Handling

Always listen for the `error` event to handle any socket errors:

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
  // Handle error appropriately
});
```

## Disconnection

The socket will automatically handle disconnection and cleanup. Users will be marked as offline when they disconnect. 