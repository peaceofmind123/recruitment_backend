FROM node:20-alpine

WORKDIR /app

# Install dependencies (include dev deps to allow ts-node for migrations)
COPY package*.json ./
RUN npm ci --include=dev

# Copy build metadata and source
COPY tsconfig*.json nest-cli.json ./
COPY typeorm.migration.config.ts ./
COPY src ./src

# Build the application (outputs to dist)
RUN npm run build

# Default command can be overridden by docker-compose
CMD ["node", "dist/main.js"]

