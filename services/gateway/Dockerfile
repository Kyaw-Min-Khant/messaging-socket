FROM node:24-alpine3.21
WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY services/gateway/package.json ./services/gateway/
COPY packages ./packages
RUN npm install --workspace=services/gateway --include-workspace-root
RUN npm run build -w packages/shared-config

COPY services/gateway/tsconfig.json ./services/gateway/
COPY services/gateway/src ./services/gateway/src
RUN npm run build -w services/gateway

EXPOSE 3000
CMD ["node", "services/gateway/dist/index.js"]
