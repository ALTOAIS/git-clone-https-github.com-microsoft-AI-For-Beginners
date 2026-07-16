FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npx tsc -p tsconfig.seed.json

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-seed ./dist-seed
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001
# ПРИМЕЧАНИЕ: `preDeployCommand` (Render) недоступен на бесплатном плане —
# Render его молча игнорирует и идёт сразу build → CMD, поэтому миграции
# ЗДЕСЬ, в CMD, а не в render.yaml. Сама причина P1002 (advisory lock не
# работает через pooled-соединение) устранена через DIRECT_URL в
# schema.prisma (directUrl) — `migrate deploy` использует его независимо
# от того, откуда вызван. Остаточный риск гонки advisory lock остаётся
# только если запустить два перекрывающихся деплоя одновременно (ручной
# Manual Deploy поверх ещё идущего auto-deploy) — на free-плане Render не
# даёт средства это сериализовать, поэтому просто не делайте так.
CMD ["sh", "-c", "npx prisma migrate deploy && (node dist-seed/prisma/seed.js || true) && node dist/main"]
