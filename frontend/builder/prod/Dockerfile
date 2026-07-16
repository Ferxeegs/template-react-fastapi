# --- STAGE 1: Build ---
    FROM node:20-alpine AS builder

    WORKDIR /app
    
    # Install dependencies
    COPY package*.json ./
    RUN npm install

    ARG VITE_API_URL
    ENV VITE_API_URL=$VITE_API_URL

    ARG VITE_TURNSTILE_SITE_KEY
    ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

    # Copy source code dan build
    COPY . .
    RUN npm run build
    
    # --- STAGE 2: Final (Nginx) ---
    FROM nginx:stable-alpine
    
    # Copy hasil build dari stage 1 ke folder statis Nginx
    COPY --from=builder /app/dist /usr/share/nginx/html
    
    # Copy konfigurasi Nginx khusus untuk Production (SPA & Security)
    COPY ./builder/prod/nginx.conf /etc/nginx/conf.d/default.conf
    
    EXPOSE 80
    
    CMD ["nginx", "-g", "daemon off;"]