FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS build
COPY package.json bun.lock vite.config.ts tsconfig.json ./
COPY src ./src
COPY convex ./convex
COPY patches ./patches
COPY public ./public


RUN bun install
RUN bun run build

FROM base AS dokploy
WORKDIR /app

# Copy only the necessary files
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/convex ./convex

EXPOSE 3000
CMD ["bun", "start"]