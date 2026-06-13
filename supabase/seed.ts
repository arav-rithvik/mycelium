import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { embed } from "@mycelium/shared/embed";
import { bayesianTrust, tokensSaved, tokensToImpact } from "@mycelium/shared";
import type { EnvFingerprint, SkillCategory } from "@mycelium/shared";

// Seeds the commons with ~100 realistic skills spread across categories, frameworks, and trust levels,
// each embedded with the local model. Idempotent: wipes and re-inserts. Run with `npm run seed`.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// Reusable environment fingerprints (where skills have been proven).
const E = {
  next15: { framework: "nextjs", frameworkVersion: "15.2", os: "darwin", runtime: "node@20" },
  next14: { framework: "nextjs", frameworkVersion: "14.2", os: "linux", runtime: "node@20" },
  next13: { framework: "nextjs", frameworkVersion: "13.5", os: "linux", runtime: "node@18" },
  react19: { framework: "react", frameworkVersion: "19.0", os: "darwin" },
  react18: { framework: "react", frameworkVersion: "18.3", os: "linux" },
  vue3: { framework: "vue", frameworkVersion: "3.4", os: "linux" },
  svelte2: { framework: "sveltekit", frameworkVersion: "2.5", os: "darwin" },
  node20: { framework: "node", frameworkVersion: "20", os: "linux", runtime: "node@20" },
  node22: { framework: "node", frameworkVersion: "22", os: "darwin", runtime: "node@22" },
  fastapi: { framework: "fastapi", frameworkVersion: "0.110", os: "linux", runtime: "python@3.12" },
  django: { framework: "django", frameworkVersion: "5.0", os: "linux", runtime: "python@3.12" },
  expo: { framework: "expo", frameworkVersion: "51", os: "darwin" },
} satisfies Record<string, EnvFingerprint>;

// [name, category, framework, description (embedded), success_check, tokens_to_create, success#, failure#, proven_envs?]
type Row = [string, SkillCategory, string, string, string, number, number, number, EnvFingerprint[]?];

const SKILLS: Row[] = [
  // --- auth ---
  ["nextjs-supabase-auth", "auth", "nextjs", "Set up Supabase email auth in the Next.js App Router using the SSR PKCE flow with cookie-based sessions", "GET /auth/callback returns a 302 redirect", 18400, 34, 1, [E.next15, E.next14]],
  ["clerk-nextjs-setup", "auth", "nextjs", "Add Clerk authentication to a Next.js app with middleware-protected routes and a user button", "middleware redirects unauthenticated users to /sign-in", 12200, 21, 0, [E.next15]],
  ["nextauth-google-oauth", "auth", "nextjs", "Configure NextAuth (Auth.js) with the Google OAuth provider and a Prisma database adapter", "signing in with Google creates a user row", 15600, 18, 2, [E.next14, E.next13]],
  ["jwt-refresh-rotation", "auth", "node", "Implement access and refresh JWT rotation in Express with httpOnly cookies and reuse detection", "an expired access token refreshes via the token endpoint", 16800, 12, 3, [E.node20]],
  ["firebase-auth-react", "auth", "react", "Wire Firebase email and password auth into a React SPA with an onAuthStateChanged context provider", "useAuth returns the signed-in user object", 9800, 15, 1, [E.react18]],
  ["supabase-rls-policies", "auth", "other", "Write Postgres row-level-security policies so users can only read and update their own rows", "anon cannot select another user's row", 11200, 9, 2, []],
  ["magic-link-email-auth", "auth", "nextjs", "Add passwordless magic-link sign-in with Supabase and a custom branded email template", "clicking the emailed link signs the user in", 10400, 7, 1, [E.next15]],
  ["totp-2fa-setup", "auth", "node", "Add TOTP two-factor authentication with otplib and QR-code provisioning for an Express API", "verifying a six-digit code returns 200", 14200, 5, 2, [E.node20]],
  ["lucia-auth-sveltekit", "auth", "sveltekit", "Set up session-based authentication with Lucia in SvelteKit backed by a Postgres adapter", "the load function exposes locals.user when logged in", 13100, 4, 1, [E.svelte2]],
  ["password-reset-flow", "auth", "nextjs", "Build a secure password reset flow with a single-use, time-limited token emailed to the user", "a reset token older than one hour is rejected", 9600, 11, 2, [E.next14]],
  ["auth0-spa-react", "auth", "react", "Integrate Auth0 into a React single-page app with universal login and silent token renewal", "getAccessTokenSilently returns a valid JWT", 10100, 0, 0, []],
  ["oauth-pkce-mobile", "auth", "expo", "Implement the OAuth 2.0 PKCE flow in an Expo app with expo-auth-session and secure token storage", "the auth flow returns an access token to the app", 12800, 3, 4, [E.expo]],
  ["passport-local-express", "auth", "node", "Set up Passport.js local-strategy auth with bcrypt password hashing and server-side sessions", "POST /login sets a session cookie", 8800, 6, 5, [E.node20]],
  ["django-allauth-google", "auth", "django", "Configure django-allauth for Google social login with email verification", "social login creates a Django user", 11900, 8, 1, [E.django]],

  // --- payments ---
  ["stripe-checkout-nextjs", "payments", "nextjs", "Create a Stripe Checkout session in a Next.js route handler and redirect to hosted checkout", "POST /api/checkout returns a Stripe session URL", 16400, 29, 1, [E.next15, E.next14]],
  ["stripe-webhooks-verify", "payments", "nextjs", "Handle Stripe webhooks in Next.js with signature verification and idempotent event processing", "an invalid webhook signature returns 400", 17200, 26, 2, [E.next15]],
  ["stripe-subscriptions", "payments", "node", "Implement Stripe subscriptions with trial periods and proration on plan changes", "upgrading a plan creates a proration invoice", 19800, 14, 2, [E.node20]],
  ["stripe-customer-portal", "payments", "nextjs", "Add the Stripe billing customer portal so users can manage their own subscriptions", "the portal session URL opens the Stripe portal", 8400, 12, 0, [E.next14]],
  ["stripe-connect-onboarding", "payments", "node", "Onboard marketplace sellers with Stripe Connect Express accounts and account links", "onboarding completes and charges_enabled becomes true", 22600, 6, 1, [E.node20]],
  ["usage-based-billing", "payments", "node", "Implement metered usage billing by reporting usage records to a Stripe metered price", "a usage record increments the upcoming invoice", 18900, 4, 2, []],
  ["paypal-checkout-react", "payments", "react", "Add PayPal Smart Buttons checkout to a React app with order capture on approval", "onApprove captures the PayPal order", 10200, 5, 3, [E.react18]],
  ["razorpay-integration", "payments", "node", "Integrate Razorpay orders and verify the payment signature on the server", "the payment signature verification passes", 11800, 3, 1, [E.node20]],
  ["lemonsqueezy-checkout", "payments", "nextjs", "Sell a digital product with Lemon Squeezy hosted checkout and license-key webhooks", "the webhook issues a license key on purchase", 9400, 0, 0, []],
  ["stripe-tax-automatic", "payments", "node", "Enable Stripe Tax for automatic sales-tax calculation at checkout", "the checkout session includes a tax line item", 8800, 2, 2, []],
  ["refund-dispute-handling", "payments", "node", "Handle refund and dispute webhooks, updating order status and notifying the customer", "a refund webhook sets the order status to refunded", 12100, 4, 1, [E.node20]],
  ["apple-iap-receipt-verify", "payments", "other", "Verify Apple in-app-purchase receipts server-side against the App Store API", "a valid receipt returns the product entitlement", 15600, 2, 3, []],

  // --- database ---
  ["supabase-pgvector-search", "database", "other", "Enable pgvector in Supabase and build a cosine-similarity search RPC over text embeddings", "the match function returns rows ordered by similarity", 14800, 17, 1, []],
  ["prisma-migrations-postgres", "database", "node", "Set up Prisma with PostgreSQL, modeled relations, and a safe production migration workflow", "prisma migrate deploy applies cleanly", 12400, 22, 2, [E.node20]],
  ["drizzle-orm-setup", "database", "node", "Configure Drizzle ORM with PostgreSQL, schema definitions, and fully typed queries", "drizzle-kit push syncs the schema", 10800, 13, 1, [E.node22]],
  ["postgres-fulltext-search", "database", "other", "Add Postgres full-text search with a tsvector column, a GIN index, and ranked results", "a search query returns rows ordered by ts_rank", 11600, 9, 2, []],
  ["redis-caching-layer", "database", "node", "Add a Redis cache-aside layer with TTLs and cache invalidation on writes", "a cached read avoids hitting the database", 10200, 14, 3, [E.node20]],
  ["mongodb-aggregation", "database", "node", "Build a MongoDB aggregation pipeline for grouped analytics with lookup joins", "the aggregation returns grouped totals", 9800, 7, 2, [E.node20]],
  ["prisma-connection-pooling", "database", "node", "Configure Prisma connection pooling with PgBouncer for serverless deployments", "no too-many-connections errors under load", 13200, 6, 3, []],
  ["supabase-realtime-postgres", "database", "other", "Enable Supabase realtime on a table and subscribe to postgres changes from the browser", "an INSERT event arrives on the client channel", 8600, 11, 1, []],
  ["database-indexing-strategy", "database", "other", "Add composite and partial indexes to eliminate slow sequential scans on a hot query", "EXPLAIN shows an index scan instead of a seq scan", 12800, 8, 1, []],
  ["neon-serverless-driver", "database", "node", "Use the Neon serverless Postgres driver over HTTP from an edge runtime", "a query runs successfully from an edge function", 9200, 3, 1, [E.node22]],
  ["postgres-triggers-audit", "database", "other", "Create Postgres triggers that write an audit-log row on every update", "updating a row inserts an audit record", 10400, 4, 2, []],
  ["prisma-seed-script", "database", "node", "Write an idempotent Prisma seed script using upserts for reference data", "re-running the seed produces no duplicate rows", 6800, 9, 0, [E.node20]],
  ["sqlite-to-postgres-migrate", "database", "other", "Migrate a SQLite database to PostgreSQL with both schema and data transfer", "row counts match after the migration", 13600, 2, 2, []],
  ["supabase-storage-uploads", "database", "other", "Configure Supabase Storage buckets with signed upload URLs and access policies", "a signed URL uploads a file successfully", 8800, 0, 0, []],

  // --- frontend ---
  ["react-force-graph-setup", "frontend", "react", "Render an interactive force-directed graph with react-force-graph-2d, custom node painting, and zoom", "the graph renders nodes and responds to drag", 11200, 12, 1, [E.react18]],
  ["framer-motion-page-transitions", "frontend", "nextjs", "Add shared-layout page transitions in the Next.js App Router with Framer Motion and AnimatePresence", "a route change animates without layout shift", 10600, 16, 2, [E.next15]],
  ["tailwind-dark-mode", "frontend", "nextjs", "Implement class-based Tailwind dark mode with a no-flash theme toggle persisted to localStorage", "toggling switches theme with no flash of wrong theme", 7200, 24, 1, [E.next15, E.next14]],
  ["shadcn-ui-setup", "frontend", "nextjs", "Set up shadcn/ui with Tailwind, the components config, and the CLI add workflow", "the shadcn add command installs a component", 6400, 28, 0, [E.next15]],
  ["react-query-infinite-scroll", "frontend", "react", "Build infinite scroll with TanStack Query useInfiniteQuery and an IntersectionObserver trigger", "scrolling to the sentinel fetches the next page", 9800, 11, 2, [E.react19]],
  ["zustand-store-persist", "frontend", "react", "Create a Zustand store with the persist middleware and selective state hydration", "store state survives a page reload", 6800, 14, 1, [E.react18]],
  ["react-hook-form-zod", "frontend", "react", "Wire React Hook Form with a Zod resolver for typed, validated forms with field-level errors", "invalid input shows a field-level error", 8200, 19, 1, [E.react19]],
  ["tanstack-table-sorting", "frontend", "react", "Build a sortable, filterable data table with TanStack Table and column visibility controls", "clicking a header sorts the column", 9400, 8, 2, [E.react18]],
  ["recharts-dashboard", "frontend", "react", "Compose a responsive analytics dashboard with Recharts area and bar charts and a shared tooltip", "the charts resize with their container", 7600, 9, 1, [E.react18]],
  ["threejs-react-fiber-scene", "frontend", "react", "Set up a React Three Fiber scene with orbit controls, lighting, and a loaded GLTF model", "the model renders and orbits on drag", 13800, 6, 2, [E.react18]],
  ["gsap-scroll-animation", "frontend", "other", "Build a scroll-driven pinned animation timeline with GSAP ScrollTrigger", "scrolling scrubs the animation timeline", 11400, 7, 1, []],
  ["radix-dialog-accessible", "frontend", "react", "Build an accessible modal dialog with Radix UI primitives and proper focus trapping", "Escape closes the dialog and restores focus", 6200, 10, 0, [E.react19]],
  ["dnd-kit-sortable", "frontend", "react", "Implement drag-and-drop sortable lists with dnd-kit and keyboard accessibility", "dragging reorders the list items", 10200, 5, 2, [E.react18]],
  ["tanstack-virtual-list", "frontend", "react", "Virtualize a ten-thousand-row list with TanStack Virtual to keep scrolling smooth", "only the visible rows are in the DOM", 9600, 4, 1, [E.react19]],
  ["next-intl-i18n", "frontend", "nextjs", "Add internationalized routing and message catalogs with next-intl in the App Router", "the localized route renders translated copy", 10800, 3, 2, [E.next15]],
  ["next-image-optimization", "frontend", "nextjs", "Optimize images with next/image, responsive sizes, and a remote-pattern allowlist", "the hero image serves a responsive srcset", 6800, 0, 0, []],

  // --- devops ---
  ["docker-multistage-node", "devops", "node", "Write a multi-stage Dockerfile for a Node app with a slim production image and good layer caching", "the built image is under 200MB", 12200, 18, 2, [E.node20]],
  ["github-actions-ci", "devops", "other", "Set up a GitHub Actions CI pipeline that installs, lints, tests, and caches dependencies", "a push triggers a green CI run", 9400, 22, 1, []],
  ["dockerize-nextjs-standalone", "devops", "nextjs", "Containerize a Next.js app using the standalone output for a minimal runtime image", "the container serves the app on port 3000", 11800, 12, 2, [E.next15]],
  ["vercel-monorepo-deploy", "devops", "nextjs", "Deploy a Next.js app from an npm-workspaces monorepo to Vercel with the right root directory", "a production deploy succeeds from the web workspace", 8600, 9, 1, [E.next15]],
  ["terraform-aws-vpc", "devops", "other", "Provision an AWS VPC with public and private subnets and a NAT gateway in Terraform", "terraform apply creates the network", 16400, 6, 2, []],
  ["kubernetes-deployment", "devops", "other", "Write a Kubernetes Deployment and Service with readiness probes and resource limits", "kubectl rollout status reports available", 14600, 5, 3, []],
  ["nginx-reverse-proxy", "devops", "other", "Configure nginx as a reverse proxy with gzip, TLS, and websocket upgrade headers", "proxied requests reach the upstream app", 10200, 8, 2, []],
  ["pm2-cluster-mode", "devops", "node", "Run a Node app under PM2 cluster mode with zero-downtime reloads", "pm2 reload restarts with no dropped requests", 7400, 4, 1, [E.node20]],
  ["cloudflare-workers-deploy", "devops", "other", "Deploy an API to Cloudflare Workers with Wrangler and environment secrets", "wrangler deploy publishes the worker", 8800, 3, 1, []],
  ["flyio-deploy-dockerfile", "devops", "node", "Deploy a Dockerized app to Fly.io with health checks and a persistent volume", "fly deploy passes its health checks", 9200, 2, 2, []],
  ["railway-postgres-deploy", "devops", "node", "Deploy a Node service with managed Postgres on Railway and run migrations on release", "the release runs migrations then starts the app", 7800, 0, 0, []],
  ["env-secrets-management", "devops", "other", "Set up environment secrets with per-environment configs and a secrets vault", "the production build reads the correct secrets", 6400, 4, 3, []],

  // --- api ---
  ["nextjs-route-handlers", "api", "nextjs", "Build typed REST route handlers in the Next.js App Router with proper status codes and JSON errors", "GET /api/items returns 200 with a JSON body", 7200, 20, 1, [E.next15]],
  ["trpc-nextjs-setup", "api", "nextjs", "Set up end-to-end typesafe APIs with tRPC, React Query, and the Next.js App Router", "a client call infers the server return type", 12800, 14, 2, [E.next15]],
  ["graphql-apollo-server", "api", "node", "Stand up an Apollo GraphQL server with schema, resolvers, and DataLoader batching", "a nested query resolves without N+1 queries", 13600, 9, 2, [E.node20]],
  ["rest-rate-limiting", "api", "node", "Add sliding-window rate limiting to an Express API with Redis and correct 429 headers", "exceeding the limit returns a 429", 9800, 13, 1, [E.node20]],
  ["socketio-realtime-chat", "api", "node", "Build a Socket.IO realtime chat with rooms, an auth handshake, and reconnection", "two clients exchange messages in a room", 11200, 8, 2, [E.node20]],
  ["server-sent-events-stream", "api", "nextjs", "Stream server-sent events from a Next.js route handler for live progress updates", "the client receives streamed event chunks", 8400, 6, 1, [E.next15]],
  ["openai-streaming-responses", "api", "node", "Stream OpenAI chat completions to the client token-by-token over a ReadableStream", "tokens render incrementally in the UI", 10600, 16, 2, [E.node22]],
  ["webhook-signature-verify", "api", "node", "Verify inbound webhook signatures with HMAC and a constant-time comparison", "a tampered payload fails verification", 9200, 7, 1, [E.node20]],
  ["cors-config-express", "api", "node", "Configure CORS correctly for credentialed cross-origin requests with an allowlist", "the preflight returns the right access-control headers", 6800, 11, 3, [E.node20]],
  ["cursor-pagination", "api", "node", "Implement keyset cursor pagination for a large list endpoint with stable ordering", "the next-page cursor returns the following rows", 9400, 8, 1, []],
  ["s3-presigned-upload", "api", "node", "Generate S3 presigned URLs for direct browser uploads with content-type and size limits", "a presigned PUT uploads a file to S3", 10800, 9, 2, [E.node20]],
  ["zod-request-validation", "api", "nextjs", "Validate and parse request bodies with Zod and return typed 422 errors", "a malformed body returns a 422 with issues", 6600, 12, 0, [E.next15]],
  ["fastapi-pydantic-crud", "api", "fastapi", "Build a FastAPI CRUD service with Pydantic v2 models and dependency-injected DB sessions", "POST /items returns the created item", 10200, 7, 1, [E.fastapi]],
  ["express-error-middleware", "api", "node", "Add centralized async error-handling middleware with typed error classes", "thrown errors return a consistent JSON shape", 6400, 10, 2, [E.node20]],

  // --- testing ---
  ["vitest-setup-coverage", "testing", "node", "Set up Vitest with coverage thresholds, jsdom, and a shared test setup file", "npm test reports coverage above the threshold", 6800, 15, 1, [E.node20]],
  ["playwright-e2e-auth", "testing", "other", "Write Playwright end-to-end tests with a reusable authenticated storage state", "a logged-in test reuses the saved session", 10400, 11, 2, []],
  ["jest-rtl-components", "testing", "react", "Test React components with Jest, React Testing Library queries, and user-event", "clicking a button updates the rendered text", 7600, 9, 2, [E.react18]],
  ["cypress-component-test", "testing", "react", "Configure Cypress component testing for a React design system", "a mounted component test passes", 8200, 4, 1, [E.react18]],
  ["msw-api-mocking", "testing", "react", "Mock network requests in tests and dev with Mock Service Worker handlers", "fetch is intercepted by the MSW handler", 7400, 8, 1, [E.react19]],
  ["supertest-api-integration", "testing", "node", "Write integration tests for an Express API with Supertest and an ephemeral database", "a POST then GET returns the created resource", 7800, 6, 1, [E.node20]],
  ["k6-load-test", "testing", "other", "Write a k6 load test with staged ramps and thresholds to find an API's breaking point", "the p95 latency stays under the threshold", 9200, 3, 2, []],
  ["storybook-setup", "testing", "react", "Set up Storybook with autodocs and interaction tests for a component library", "stories render in the Storybook UI", 8600, 5, 1, [E.react18]],
  ["github-actions-test-matrix", "testing", "other", "Run tests across a Node version matrix in GitHub Actions with fail-fast disabled", "all matrix legs report their status", 6400, 0, 0, []],
  ["playwright-visual-regression", "testing", "other", "Add visual regression tests with Playwright screenshot snapshots and a CI baseline", "a pixel diff fails the test", 8800, 2, 3, []],

  // --- other ---
  ["sentry-error-tracking", "other", "nextjs", "Instrument a Next.js app with Sentry for error and performance monitoring with source maps", "a thrown error appears in Sentry", 7600, 13, 1, [E.next15]],
  ["posthog-product-analytics", "other", "react", "Add PostHog product analytics with autocapture and a typed event helper", "custom events show up in PostHog", 6800, 9, 1, [E.react18]],
  ["resend-transactional-email", "other", "nextjs", "Send transactional email with Resend and React Email templates", "sending returns a delivered message id", 6400, 11, 1, [E.next15]],
  ["cron-jobs-vercel", "other", "nextjs", "Schedule background jobs with Vercel Cron hitting a secured route handler", "the cron route runs on schedule and returns 200", 5800, 6, 1, [E.next15]],
  ["upstash-ratelimit-edge", "other", "nextjs", "Add distributed rate limiting at the edge with Upstash Redis and the ratelimit library", "over-limit requests get a 429 at the edge", 7200, 5, 1, [E.next15]],
  ["langchain-rag-pipeline", "other", "node", "Build a retrieval-augmented-generation pipeline with LangChain, a vector store, and citations", "the answer cites the retrieved source chunks", 15200, 8, 3, [E.node20]],
  ["pinecone-vector-upsert", "other", "node", "Upsert and query embeddings in Pinecone with namespaces and metadata filters", "a filtered query returns the right namespace", 9800, 4, 2, [E.node20]],
  ["openai-function-calling", "other", "node", "Implement OpenAI function and tool calling with a typed tool registry and argument validation", "the model invokes the tool with valid arguments", 11600, 10, 2, [E.node22]],
];

async function main() {
  console.log(`Seeding ${SKILLS.length} skills (embedding locally — first run downloads the model)...`);

  // Idempotent: clear existing rows so re-running gives a clean commons.
  await supabase.from("trails").delete().not("id", "is", null);
  await supabase.from("skills").delete().not("id", "is", null);

  const rows: Record<string, unknown>[] = [];
  let totalSaved = 0;
  let totalReuses = 0;

  for (let i = 0; i < SKILLS.length; i++) {
    const [name, category, framework, description, success_check, tokens, succ, fail, envs] = SKILLS[i]!;
    const vector = await embed(description);
    rows.push({
      name,
      description,
      category,
      framework,
      content: `# ${name}\n\n${description}\n\n## success_check\n\`${success_check}\`\n`,
      success_check,
      embedding: JSON.stringify(vector), // pgvector parses the "[...]" text form
      trust_score: bayesianTrust(succ, fail),
      success_count: succ,
      failure_count: fail,
      tokens_to_create: tokens,
      proven_envs: envs ?? [],
      visibility: "public",
      owner_id: null,
    });
    totalReuses += succ;
    totalSaved += succ * tokensSaved(tokens); // each past success ≈ one reuse that saved ~80%
    if ((i + 1) % 20 === 0) console.log(`  embedded ${i + 1}/${SKILLS.length}`);
  }

  const { data: inserted, error } = await supabase
    .from("skills")
    .insert(rows)
    .select("id, tokens_to_create");
  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }
  console.log(`Inserted ${inserted?.length ?? 0} skills.`);

  // A handful of illustrative recent reuse edges so the graph isn't edgeless at demo start.
  const skills = inserted ?? [];
  const trails: Record<string, unknown>[] = [];
  const edgeCount = Math.min(50, skills.length);
  for (let i = 0; i < edgeCount; i++) {
    const s = skills[(i * 7) % skills.length]!; // deterministic spread, no RNG
    trails.push({
      skill_id: s.id,
      task_type: "reuse",
      approach: "applied_from_commons",
      success: true,
      environment: {},
      tokens_used: Math.round(s.tokens_to_create * 0.2),
      tokens_saved: tokensSaved(s.tokens_to_create),
      timestamp: new Date(Date.now() - i * 90_000).toISOString(),
    });
  }
  if (trails.length) await supabase.from("trails").insert(trails);
  console.log(`Inserted ${trails.length} reuse trails.`);

  // Seed the impact ticker to a consistent starting total derived from the historical reuses above.
  const impact = tokensToImpact(totalSaved);
  await supabase
    .from("stats")
    .update({
      total_tokens_saved: Math.round(totalSaved),
      total_energy_wh: impact.energyWh,
      total_water_ml: impact.waterMl,
      total_co2_g: impact.co2g,
      total_reuses: totalReuses,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  console.log(
    `Done. ${SKILLS.length} skills · ${totalReuses} historical reuses · ${Math.round(totalSaved).toLocaleString()} tokens saved on the ticker.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
