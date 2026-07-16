# Development Dockerfile - Optimized for hot reload
FROM node:20-alpine

# Install dependencies yang diperlukan untuk native modules
RUN apk add --no-cache \
    libc6-compat \
    wget \
    python3 \
    make \
    g++ \
    musl-dev

WORKDIR /app

# Copy package files terlebih dahulu untuk layer caching
COPY package.json package-lock.json* ./

# Clean install dependencies dengan npm ci
# --include=optional untuk memastikan platform-specific binaries terinstall
# --force untuk memastikan semua dependencies terinstall ulang
RUN npm ci --legacy-peer-deps --include=optional --force || \
    (npm install --legacy-peer-deps --include=optional --force && \
     npm rebuild --include=optional)

# Verifikasi lightningcss platform-specific binary terinstall untuk Alpine Linux
RUN node -e "console.log('Platform:', process.platform, process.arch)" && \
    ls -la node_modules/lightningcss-linux-x64-musl* 2>/dev/null && \
    echo "✓ lightningcss-linux-x64-musl found" || \
    (ls -la node_modules/lightningcss-linux-x64-gnu* 2>/dev/null && \
     echo "✓ lightningcss-linux-x64-gnu found" || \
     echo "⚠ Warning: lightningcss platform binary not found")

# Copy source code (akan di-override oleh volume di docker-compose)
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Set environment variables untuk optimasi
ENV NODE_ENV=development
ENV VITE_HMR_PORT=5173
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

# Run Vite dev server dengan optimasi
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
