FROM node:24-alpine3.21

WORKDIR /app

COPY package*.json ./

COPY .env ./

RUN npm install

COPY tsconfig.json ./

COPY src ./src

RUN npm run build

EXPOSE 3000

CMD ["node","dist/index.js"]