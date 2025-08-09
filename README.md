# Chat App Server

A real-time chat application server built with Node.js, Express, TypeScript, and Socket.IO.

## Features

- Real-time messaging with Socket.IO
- Room-based chat system
- User join/leave notifications
- Typing indicators
- REST API endpoints
- TypeScript support
- CORS enabled for frontend integration

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Clone or download this project
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```bash
   PORT=3001
   CLIENT_URL=http://localhost:3000
   NODE_ENV=development,
   MONGODB_URI,
   JWT_SECRET,
   FIREBASE_PROJECT_ID,
   FIREBASE_PRIVATE_KEY_ID
   FIREBASE_CLIENT_EMAIL,
   FIREBASE_CLIENT_ID,
   REDIS_URL,
   REDIS_PASSWORD,
   REDIS_PORT,
   JWT_EXPIRES_IN
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests

## Development

Start the development server:

```bash
npm run dev
```

The server will start on `http://localhost:3001` (or the port specified in your `.env` file).

## API Endpoints

### REST API

- `GET /` - Server status and info
- `GET /api/users` - Get all connected users
- `GET /api/rooms` - Get all active rooms

### Socket.IO Events

#### Client to Server

- `join` - Join a chat room

  ```javascript
  socket.emit("join", { username: "John", room: "general" });
  ```

- `sendMessage` - Send a message

  ```javascript
  socket.emit("sendMessage", { message: "Hello world!", room: "general" });
  ```

- `typing` - Send typing indicator

  ```javascript
  socket.emit("typing", { isTyping: true, room: "general" });
  ```

- `changeRoom` - Change to a different room
  ```javascript
  socket.emit("changeRoom", { newRoom: "random" });
  ```

#### Server to Client

- `userJoined` - User joined the room
- `userLeft` - User left the room
- `newMessage` - New message received
- `userTyping` - User typing indicator
- `roomUsers` - List of users in current room

## Client Integration Example

Here's a basic example of how to connect from a client:

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

// Join a room
socket.emit("join", { username: "YourName", room: "general" });

// Listen for messages
socket.on("newMessage", (message) => {
  console.log("New message:", message);
});

// Send a message
socket.emit("sendMessage", { message: "Hello everyone!" });

// Listen for user events
socket.on("userJoined", (data) => {
  console.log(`${data.username} joined the chat`);
});

socket.on("userLeft", (data) => {
  console.log(`${data.username} left the chat`);
});
```

## Project Structure

```
├── src/
│   └── index.ts          # Main server file
├── dist/                 # Compiled JavaScript (generated)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `CLIENT_URL` - Allowed CORS origin (default: http://localhost:3000)
- `NODE_ENV` - Environment mode (development/production)

## Building for Production

1. Build the TypeScript code:

   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC
