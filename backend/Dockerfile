# ---------- Stage 1: deps ----------
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci || npm install

# ---------- Stage 2: build ----------
FROM deps AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate the Prisma client for the target platform (musl) + host (native)
RUN npx prisma generate
RUN npm run build

# ---------- Stage 3: runtime ----------
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl libc6-compat \
  && addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Run migrations + seed as non-root, then start
USER nodeapp
EXPOSE 4000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]