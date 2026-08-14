# Build context is the repo root (this is a pnpm workspace monorepo, so the backend
# needs its sibling packages/types at build time):
#   docker build -f apps/backend/Dockerfile -t sentinel-desk-api .
#
# Render's actual deploy uses render.yaml's native Node runtime, not this image - this
# Dockerfile exists for anyone who wants to self-host on Docker/Kubernetes/etc instead.

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sentinel-desk/backend exec prisma generate
RUN pnpm --filter @sentinel-desk/backend build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo
# Kept simple (whole workspace node_modules, not a --prod-pruned copy) rather than
# fighting pnpm's symlinked store across build stages - correctness over image size here.
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /repo/apps/backend/dist ./apps/backend/dist
COPY --from=build /repo/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /repo/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /repo/packages/types ./packages/types
COPY --from=build /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /repo/package.json ./package.json

EXPOSE 4000
CMD ["sh", "-c", "cd apps/backend && npx prisma migrate deploy && node dist/main.js"]
