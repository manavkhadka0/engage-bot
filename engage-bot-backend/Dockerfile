# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# No pnpm in the runtime image: start.sh calls the prisma binary directly, so
# booting never downloads pnpm or touches the npm registry.
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
# prisma/seed-platform.ts imports ../src/auth/auth, so the first-deploy seed
# (node_modules/.bin/tsx prisma/seed-platform.ts) needs the sources too.
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./tsconfig.json
RUN chmod +x ./scripts/start.sh
EXPOSE 3000
CMD ["./scripts/start.sh"]
