# ── Backend Dockerfile ────────────────────────────────────────────────────────
# Node 20 LTS Alpine for small image size
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files first (layer cache)
COPY package.json package-lock.json ./

# Install production deps only
RUN npm ci --omit=dev

# Copy source
COPY . .

# Create uploads directory (needed at runtime)
RUN mkdir -p uploads/calls

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 5000

# Use dumb-init so Node receives SIGTERM properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
