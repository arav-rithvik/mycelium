# Deploy Mycelium as a public remote MCP server

Goal: turn the local stdio MCP server into **one public HTTP URL** that anyone can connect Claude Code to — without cloning our repo or holding our Supabase keys. The keys live only on the host (Railway). Users connect with a single command.

---

## 1. What changes, and why

| | Local (today) | Remote (this guide) |
|---|---|---|
| Transport | `StdioServerTransport` — Claude Code spawns `tsx mcp/src/index.ts` as a child process and talks over stdin/stdout | `StreamableHTTPServerTransport` — the server runs 24/7 on a host and answers HTTP `POST /mcp` |
| Who has the keys | every user, in their own `.env` | **only the host** (Railway env vars) |
| To connect | clone repo, `npm install`, set env, run | one line: `claude mcp add --transport http …` |

Why this matters: the whole point of Mycelium is a **shared commons**. If every teammate runs their own stdio server, they each need the service-role key and a checkout of the code — that doesn't scale past us. One hosted HTTP endpoint means anyone (a judge, a stranger from the website) can join the commons with zero setup, and the `SUPABASE_SERVICE_ROLE_KEY` (god-mode, RLS-bypassing) never leaves the host.

### Code prep — already done

`mcp/src/http.ts` (the HTTP entry: all 5 tools over `StreamableHTTPServerTransport`, a per-session `McpServer` keyed by the `Mcp-Session-Id` header, a single server-side owner identity (`MYCELIUM_OWNER_ID`, default `public` — the shared commons; no client-trusted identity), plus `GET /health`), the root `Dockerfile`, `.dockerignore`, and `railway.json` are **already in the repo**. Nothing to write — just make sure they're committed and pushed to `arav-rithvik/mycelium`.

---

## 2. Deploy on Railway (primary)

1. Go to **railway.app → New Project → Deploy from GitHub repo** → pick `arav-rithvik/mycelium`. Railway detects the `Dockerfile` and builds from it.
2. **Variables** tab → add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = the service-role key (Supabase → Project Settings → API)
   - Do **not** set `PORT`; Railway injects it and our server reads `process.env.PORT`.
3. **Deploy.** Watch the build logs until you see `MCP HTTP server listening`.
4. **Settings → Networking → Generate Domain.** Copy the public URL, e.g. `https://mycelium-production.up.railway.app`. Your MCP endpoint is that URL **+ `/mcp`**.

> **Host signup/login is manual — it cannot be automated.** Creating the Railway account, authorizing GitHub, and any interactive setup are browser, human-in-the-loop steps. A teammate clicks through them once. Everything after — env vars, redeploys — is repeatable.

### Render (one-line alternative)
New → **Web Service** → connect the same repo → Runtime **Docker** → add the same two env vars → Create. Render gives you `https://<service>.onrender.com`; endpoint is `…onrender.com/mcp`.

---

## 3. The one-line install (give this to anyone / put on the site)

```bash
claude mcp add --transport http mycelium https://<your-url>/mcp
```

Then inside Claude Code, turn on sharing to contribute to the commons:

```
/mycelium on
```

That's it — no repo, no keys, no npm. `/mycelium on` calls the `set_sharing` tool (`enabled=true`), so every new skill that user publishes joins the public commons; `/mycelium off` keeps their skills private.

---

## 4. Corrected install-page copy (for Rithvik)

The current install page is **wrong** and must change in two ways:

**A. Replace the npm/install command** with the HTTP transport command:

```bash
claude mcp add --transport http mycelium https://<your-url>/mcp
```

**B. DELETE the `TERMINAL · NPM: npx -y @mycelium/mcp` box entirely.**

Why: an MCP server is **not** something a user runs by hand. `npx -y @mycelium/mcp` would launch a *stdio* server that sits waiting for JSON-RPC on stdin — in a normal terminal it just **hangs forever** with no output. The user's MCP *client* (Claude Code) is what launches/connects to a server, not the human. With remote HTTP there's nothing to run locally at all — `claude mcp add` just registers the URL. Showing a bare `npx` box teaches the wrong mental model and produces a frozen terminal. Cut it.

**Corrected snippet (drop-in):**

```
Connect Claude Code to the Mycelium commons — one command, no install:

  claude mcp add --transport http mycelium https://<your-url>/mcp

Then start sharing:

  /mycelium on
```

(Replace `<your-url>` with the Railway domain from step 2.4.)

---

## 5. 60-second local smoke test

Before you push, confirm the HTTP server boots and answers:

```bash
PORT=3333 npx tsx mcp/src/http.ts
```

In a second terminal:

```bash
curl http://localhost:3333/health
# → ok
```

If `/health` returns `ok`, the server is up and the same image will work on Railway. (A `200` on `/health` is also what Railway/Render use to mark the deploy live.) Ctrl-C to stop.
