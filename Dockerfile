# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install --ignore-scripts

COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:24-alpine AS production

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/src/main.js"]