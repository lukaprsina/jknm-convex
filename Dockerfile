FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS build

# Declare build arguments for environment variables (no longer need CONVEX_DEPLOY_KEY)
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG JKNM_SERVICE_ACCOUNT_CREDENTIALS
ARG JKNM_WORKSPACE_ID
ARG NODE_ENV
ARG SITE_URL
ARG VITE_AWS_BUCKET_NAME
ARG VITE_AWS_REGION
ARG VITE_CONVEX_SITE_URL

# Set environment variables from build arguments
ENV GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
ENV GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
ENV JKNM_SERVICE_ACCOUNT_CREDENTIALS=$JKNM_SERVICE_ACCOUNT_CREDENTIALS
ENV JKNM_WORKSPACE_ID=$JKNM_WORKSPACE_ID
ENV NODE_ENV=$NODE_ENV
ENV SITE_URL=$SITE_URL
ENV VITE_AWS_BUCKET_NAME=$VITE_AWS_BUCKET_NAME
ENV VITE_AWS_REGION=$VITE_AWS_REGION
ENV VITE_CONVEX_SITE_URL=$VITE_CONVEX_SITE_URL

COPY package.json bun.lock vite.config.ts tsconfig.json ./
COPY src ./src
COPY convex ./convex
COPY patches ./patches
COPY public ./public

RUN bun install
RUN bun run build:local

FROM base AS dokploy
WORKDIR /app

# Copy only the necessary files
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/convex ./convex

EXPOSE 3000
CMD ["bun", "start"]