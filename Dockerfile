# syntax=docker/dockerfile:1.7

# ---- Stage 1: build ---------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies separately to leverage layer cache
COPY package.json ./
# Use install (not ci) since lockfile may not be committed for v0.1
RUN npm install --no-audit --no-fund --loglevel=error

# Copy the rest of the source and build
COPY astro.config.mjs tsconfig.json ./
COPY src ./src
COPY public ./public

RUN npm run build

# ---- Stage 2: serve ---------------------------------------------------------
FROM nginx:alpine AS runtime

# Remove the default nginx site config
RUN rm -f /etc/nginx/conf.d/default.conf

# Custom nginx config (SPA-friendly 404, gzip, cache headers, /healthz)
COPY nginx.conf /etc/nginx/conf.d/srenix-website.conf

# Copy the static site
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Run nginx in the foreground (default cmd)
CMD ["nginx", "-g", "daemon off;"]
