# Multi-stage Dockerfile for GoaTourismPortal
# Optimized for Coolify deployment with pnpm

# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Production
FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY drizzle.config.ts ./

# Install production dependencies + drizzle-kit for migrations
RUN pnpm install --prod --frozen-lockfile && \
    pnpm add -D drizzle-kit

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/attached_assets ./attached_assets

# Create uploads directory with proper permissions
RUN mkdir -p uploads/initial uploads/ministry_docs && \
    chown -R node:node uploads

# Use non-root user for security
USER node

# Expose port (Coolify will override with PORT env var)
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start script: run migrations then start app
CMD ["sh", "-c", "node_modules/.bin/drizzle-kit push && node dist/index.js"]
