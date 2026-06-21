# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
ARG PUBLIC_SITE_URL=https://h8f4.fr
ARG PUBLIC_BASE_PATH=
ARG PUBLIC_NOINDEX=false
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL \
    PUBLIC_BASE_PATH=$PUBLIC_BASE_PATH \
    PUBLIC_NOINDEX=$PUBLIC_NOINDEX
RUN npm run build:docker

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

RUN groupadd -r astro && useradd -r -g astro astro

COPY --from=build --chown=astro:astro /app/dist ./dist

USER astro
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "./dist/server/entry.mjs"]
