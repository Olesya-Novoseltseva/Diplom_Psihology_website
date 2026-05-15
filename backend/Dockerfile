FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci

FROM base AS build
COPY backend backend
RUN npm exec --workspace=backend -- prisma generate \
  && npm run build --workspace=backend

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

COPY --from=base /app/node_modules node_modules
COPY backend/prisma backend/prisma
COPY --from=build /app/backend/dist backend/dist
COPY backend/scripts/docker-entrypoint.sh backend/scripts/docker-entrypoint.sh

# Strip Windows CRLF on Windows dev machines (fixes "exec: … not found" from node's base entrypoint).
# Avoid relying on node's /usr/local/bin/docker-entrypoint.sh interpreting CMD — run explicitly via /bin/sh.
RUN sed -i 's/\r$//' backend/scripts/docker-entrypoint.sh \
  && npm exec --workspace=backend -- prisma generate \
  && chmod +x backend/scripts/docker-entrypoint.sh \
  && mkdir -p /app/uploads

EXPOSE 4000

ENTRYPOINT ["/bin/sh", "/app/backend/scripts/docker-entrypoint.sh"]
