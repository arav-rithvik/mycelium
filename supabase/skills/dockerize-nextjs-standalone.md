# dockerize-nextjs-standalone

> Containerize a Next.js app with output:'standalone' as a minimal multi-stage production Docker image.

**Framework:** Next.js (14/15)  ·  **Category:** devops  ·  **Dependencies:** Docker, `next` (output: 'standalone')

## Steps

1. Enable standalone output so `next build` emits a self-contained `server.js` plus only the production node_modules it actually traces.

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

module.exports = nextConfig;
```

2. Add a `.dockerignore` so local build artifacts and VCS metadata never enter the build context (faster, smaller, avoids stale `.next`).

```
# .dockerignore
node_modules
.next
.git
npm-debug.log
Dockerfile
.dockerignore
.env*.local
```

3. Write the multi-stage Dockerfile. The `deps` stage installs from the lockfile only (cached unless deps change), `builder` compiles, and `runner` ships a slim image. Copy package files before source so the install layer caches across source edits. `.next/standalone` does NOT include static assets or `public/` — copy `.next/static` and `public` separately or you serve unstyled pages and 404 assets.

```dockerfile
# Dockerfile
# ---- deps: install production-resolvable deps from the lockfile ----
FROM node:20-alpine AS deps
# libc6-compat is needed by some native deps on Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: compile the app ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimal production image ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as non-root: never run a public-facing server as root.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# public/ is not part of standalone — copy it explicitly.
COPY --from=builder /app/public ./public

# Standalone server + traced node_modules (owned by the app user).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets are NOT in standalone — without this you get unstyled 404s.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# HOSTNAME=0.0.0.0 makes the server bind all interfaces; default 127.0.0.1
# is unreachable from outside the container.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# standalone build entrypoint
CMD ["node", "server.js"]
```

4. Build and run.

```bash
docker build -t my-next-app .
docker run -p 3000:3000 my-next-app
```

## Gotchas

- `.next/standalone` ships `server.js` and traced `node_modules`, but NOT `.next/static` or `public/`. Skip the two separate `COPY` lines and the page loads with no CSS/JS and broken images. This is the single most common failure.
- The standalone `server.js` defaults to binding `127.0.0.1`. Inside a container that is unreachable from the host even with `-p 3000:3000`. You must set `ENV HOSTNAME=0.0.0.0`.
- Use `npm ci` (not `npm install`) in the `deps` stage: it installs exactly from `package-lock.json`, is deterministic, and fails loudly if the lockfile is out of sync.
- Copy `package.json` + `package-lock.json` before `COPY . .`. If you copy source first, every code change busts the `npm ci` layer and reinstalls all dependencies on every build.
- If a `.env*.local` file leaks into the image it can override production env at runtime — keep it in `.dockerignore`. Public runtime config that must be inlined (`NEXT_PUBLIC_*`) has to be present at build time, not just at `docker run`.

## success_check
`docker run -p 3000:3000 <image> serves the app on :3000 and the built image is well under 200MB`
