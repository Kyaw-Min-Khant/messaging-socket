FROM node:24-alpine3.21
WORKDIR /app

COPY package*.json tsconfig.base.json ./
COPY services/chat-service/package.json ./services/chat-service/
RUN npm install --workspace=services/chat-service --include-workspace-root

COPY services/chat-service/tsconfig.json ./services/chat-service/
COPY services/chat-service/src ./services/chat-service/src
RUN npm run build -w services/chat-service

# Run from the service folder: Swagger reads src/routes relative to dist/.
WORKDIR /app/services/chat-service
EXPOSE 1500
CMD ["node", "dist/index.js"]
