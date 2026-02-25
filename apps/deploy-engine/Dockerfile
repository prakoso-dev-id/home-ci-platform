FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json ./
COPY apps/deploy-engine/package.json ./apps/deploy-engine/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN npm install --workspace=apps/deploy-engine --workspace=packages/shared-types

# Copy source
COPY tsconfig.base.json ./
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/deploy-engine/ ./apps/deploy-engine/

# Build
RUN npm run build -w packages/shared-types
RUN npm run build -w apps/deploy-engine

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=base /app/package.json ./
COPY --from=base /app/apps/deploy-engine/package.json ./apps/deploy-engine/
COPY --from=base /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=base /app/packages/shared-types/dist/ ./packages/shared-types/dist/
COPY --from=base /app/apps/deploy-engine/dist/ ./apps/deploy-engine/dist/
COPY --from=base /app/apps/deploy-engine/config/ ./apps/deploy-engine/config/

RUN npm install --workspace=apps/deploy-engine --workspace=packages/shared-types --omit=dev

# Install docker CLI and git for compose/deploy operations
RUN apk add --no-cache docker-cli docker-cli-compose git

EXPOSE 4000
CMD ["node", "apps/deploy-engine/dist/index.js"]
