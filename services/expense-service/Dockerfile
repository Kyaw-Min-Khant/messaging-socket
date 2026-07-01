FROM node:24-alpine3.21
WORKDIR /app

# Prisma's query engine needs a real OpenSSL on Alpine, not the default detection fallback
RUN apk add --no-cache openssl

COPY package*.json ./
COPY tsconfig.base.json ./
COPY services/expense-service/package.json ./services/expense-service/
COPY packages ./packages
RUN npm install --workspace=services/expense-service --include-workspace-root
RUN npm run build -w packages/shared-auth -w packages/shared-errors

COPY services/expense-service/tsconfig.json ./services/expense-service/
COPY services/expense-service/prisma ./services/expense-service/prisma
COPY services/expense-service/src ./services/expense-service/src
RUN npm run build -w services/expense-service

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=services/expense-service/prisma/schema.prisma && node services/expense-service/dist/index.js"]
