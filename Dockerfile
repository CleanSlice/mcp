# Build stage
#
# Bun is the package manager (docs/02-standards/bun.md), Node is the runtime —
# so the builder is a Node image with the Bun binary copied in, not `oven/bun`.
#
# That is not cosmetic. `oven/bun` ships a *shim* named `node`, so `nest build`
# runs under Bun there, and Nest's tsconfig-paths hook then leaves `#mcp` in the
# emitted JS instead of rewriting it to a relative path. The image builds
# cleanly and crashes on boot with `Cannot find module '#mcp'`. With a real Node
# under the build, the aliases are rewritten as they always were.
FROM node:20-alpine AS builder

COPY --from=oven/bun:1-alpine /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies — frozen, so a build can never quietly move the lockfile
RUN bun install --frozen-lockfile

# Copy source code
COPY src ./src

# Copy documentation (needed by knowledge slice at runtime)
COPY docs ./docs

# Build the application
RUN bun run build

# Production dependencies, resolved apart from the dev ones above so only they
# are carried into the runtime image
FROM node:20-alpine AS deps

COPY --from=oven/bun:1-alpine /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling and curl for health checks
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package.json bun.lock ./

# Copy production dependencies resolved by Bun
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy documentation from builder stage (needed at runtime)
COPY --from=builder --chown=nestjs:nodejs /app/docs ./docs

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Set default docs path
ENV DOCS_PATH=/app/docs
ENV PORT=8080

# Start the application
CMD ["node", "dist/main"]
