# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/typescript-config ./packages/typescript-config
COPY packages/ecrin/package.json ./packages/ecrin/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy ecrin source code
COPY packages/ecrin ./packages/ecrin

# Build
RUN pnpm -F ecrin build

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/packages/ecrin/build ./build
COPY --from=builder /app/packages/ecrin/package.json ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "build"]
