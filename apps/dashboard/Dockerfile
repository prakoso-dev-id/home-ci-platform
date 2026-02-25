FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN npm install --workspace=apps/dashboard --workspace=packages/shared-types

# Copy source
COPY tsconfig.base.json ./
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/dashboard/ ./apps/dashboard/

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w apps/dashboard

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=base /app/apps/dashboard/.next/standalone ./
COPY --from=base /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=base /app/apps/dashboard/public ./apps/dashboard/public

EXPOSE 3001
CMD ["node", "apps/dashboard/server.js"]
