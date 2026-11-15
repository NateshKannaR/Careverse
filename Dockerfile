# =====================================================================
# CAREVERSE PRODUCTION DOCKERFILE
# Multi-stage build optimized for Google Cloud Run / Container Platforms
# =====================================================================

# 1. Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root manifests and workspace package.json files
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all dependencies including devDependencies
RUN npm ci

# Copy full source code
COPY server/ ./server/
COPY client/ ./client/
COPY database/ ./database/

# Build client Vite bundle and compile server TypeScript
RUN npm run build --workspace=server
RUN npm run build --workspace=client

# 2. Production Runner Stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy root and workspace package files
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install only production dependencies
RUN npm ci --omit=dev --workspace=server

# Copy compiled backend dist and client static build from builder stage
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/database ./database

# Expose port (Google Cloud Run defaults to 8080)
EXPOSE 8080

# Start server
CMD ["node", "server/dist/server.js"]
