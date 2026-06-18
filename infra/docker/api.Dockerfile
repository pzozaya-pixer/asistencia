FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --filter ./apps/api... --ignore-workspace

COPY apps/api ./apps/api

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["pnpm", "start:dev"]

