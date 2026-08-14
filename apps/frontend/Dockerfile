# Build context is the repo root (pnpm workspace monorepo):
#   docker build -f apps/frontend/Dockerfile -t sentinel-desk-web .
#
# Uses Next's `output: standalone` (see next.config.ts) so the runtime image only
# needs the traced production node_modules, not the whole workspace install.

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_APP_NAME=SentinelDesk
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
RUN pnpm --filter @sentinel-desk/frontend build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /repo/apps/frontend/.next/standalone ./
COPY --from=build /repo/apps/frontend/.next/static ./apps/frontend/.next/static
# No apps/frontend/public directory exists in this project (no static assets checked
# in yet) - add a COPY for it here if one is ever added.

EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
