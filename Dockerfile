# syntax=docker/dockerfile:1

# Mycelium MCP HTTP server.
# Build context MUST be the repo ROOT (this is an npm-workspaces monorepo):
#   docker build -t mycelium-mcp .
#
# Why multi-stage: stage 1 ("deps") does the slow `npm ci` against the lockfile
# in its own layer so it only re-runs when a package.json/lockfile changes — not
# on every source edit. Stage 2 ("runner") copies those installed node_modules in
# and adds the source. The app runs straight from TypeScript via `tsx` (no compile
# step), matching how it's run in dev, so there's no separate build output to copy.

# ---------------------------------------------------------------------------
# Stage 1 — deps: install the whole workspace once, cached on manifests only.
# ---------------------------------------------------------------------------
FROM node:20-slim AS deps
WORKDIR /app

# Copy ONLY the manifests + lockfile first. npm needs every workspace's
# package.json present to resolve the workspace graph (the `*` deps like
# "@mycelium/shared": "*" are local symlinks, not registry packages).
# Listing them explicitly keeps this layer cached until a manifest actually changes.
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/package.json
COPY mcp/package.json ./mcp/package.json
COPY web/package.json ./web/package.json

# `npm ci` = clean, lockfile-exact, reproducible install across all workspaces.
# It deletes any existing node_modules and installs the exact versions pinned in
# package-lock.json (unlike `npm install`, which may mutate the lockfile).
RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2 — runner: the actual image we ship.
# ---------------------------------------------------------------------------
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Bring in the resolved dependency tree (incl. workspace symlinks) from `deps`,
# then layer the source on top. We only need the packages this server imports:
# shared (embeddings + contracts) and mcp (the HTTP server + tools).
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY shared ./shared
COPY mcp ./mcp

# --- Embeddings cache (@xenova/transformers, Supabase/gte-small) ---
# The model is NOT baked into the image; on first request the library downloads
# ~30MB from the HuggingFace hub and caches it to disk, so subsequent cold starts
# (and other requests in the same container) reuse it.
#
# IMPORTANT: transformers.js v2 caches to `<pkg>/.cache/` inside node_modules and
# does NOT read the TRANSFORMERS_CACHE env var (that's the Python lib's convention).
# So the load-bearing requirement is simply that the package dir is WRITABLE by the
# runtime user. We chown the app tree to the non-root `node` user below so that
# `node_modules/@xenova/transformers/.cache/` can be created at runtime. Without a
# writable dir the lib logs a warning and silently re-downloads on every call.
#
# TRANSFORMERS_CACHE is exported for documentation / forward-compat (v3 honors it)
# and in case shared/src/embed.ts is ever updated to pass env.cacheDir explicitly.
ENV TRANSFORMERS_CACHE=/app/.cache/transformers
RUN mkdir -p /app/.cache/transformers \
  && chown -R node:node /app

# node:20-slim ships a non-root `node` user (uid 1000). Run as it: a compromised
# process then can't write outside the dirs we explicitly handed it.
USER node

# The HTTP server listens on PORT (defaults to 3333 in code). EXPOSE is docs only;
# the platform still maps the port. Bind to 0.0.0.0 inside the server so it's
# reachable from outside the container.
ENV PORT=3333
EXPOSE 3333

# Run the HTTP entry directly from TypeScript with tsx (no build step). `npx`
# resolves the tsx binary from the workspace node_modules.
CMD ["npx", "tsx", "mcp/src/http.ts"]
