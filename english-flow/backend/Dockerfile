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
# Миграции и сиды выполняются через Render preDeployCommand (см. render.yaml)
# ДО старта нового инстанса — не здесь. Так исключены гонки за postgres
# advisory lock между CMD перекрывающихся деплоев (см. комментарий в render.yaml).
CMD ["node", "dist/main"]
