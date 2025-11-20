FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy application source (JS) and other necessary files
COPY src ./src

EXPOSE 8080

# Start the JS entrypoint directly
CMD ["node", "src/index.js"]
