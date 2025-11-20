# Builder stage
FROM node:20 AS builder

WORKDIR /app

# Copy package files and install all deps
COPY package.json package-lock.json* ./
RUN npm install

# Copy sources and build TS
COPY . .
# RUN npm run build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy production dependencies and built files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Use port from environment variable (Leapcell)
EXPOSE 8080
ENV PORT=8080

# Start bot
CMD ["node", "dist/index.js"]
