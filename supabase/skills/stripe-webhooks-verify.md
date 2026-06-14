# stripe-webhooks-verify

> Handle Stripe webhooks in a Next.js App Router route handler with signature verification and idempotent event processing.

**Framework:** Next.js App Router (14/15) · **Category:** payments · **Dependencies:** `stripe`

## Steps

1. **Install the SDK and set env vars.** `STRIPE_WEBHOOK_SECRET` comes from `stripe listen` locally (starts `whsec_`) or the Dashboard endpoint in production — they are different values.

```bash
npm install stripe
# .env.local
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

2. **Initialize a single Stripe client with a pinned `apiVersion`.** Pinning the version means Stripe won't silently reshape event payloads when they update their default API. One shared module avoids re-instantiating per request.

```ts
// lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil", // pin; do not float
});
```

3. **Read the RAW request body.** Signature verification hashes the exact bytes Stripe sent. `request.json()` reparses and re-serializes the body, changing the bytes and breaking the signature — always use `request.text()`. This route is dynamic, so no extra `bodyParser` config is needed in App Router (unlike the old Pages API).

```ts
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// in-memory dedupe for demo; use a DB table in production (see step 6)
const processedEvents = new Set<string>();

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
```

4. **Verify the signature inside try/catch; return 400 on failure.** `constructEvent` throws if the signature, secret, or body don't match. A bad signature is an untrusted caller — never process it.

```ts
let event: Stripe.Event;
try {
  event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
} catch (err) {
  const msg = err instanceof Error ? err.message : "Unknown error";
  console.error(`Webhook signature verification failed: ${msg}`);
  return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
}
```

5. **Skip duplicates by `event.id`, then switch on `event.type`.** Stripe delivers at-least-once: the same event can arrive more than once (retries, network blips). Dedupe before doing side effects so you don't double-fulfill an order.

```ts
if (processedEvents.has(event.id)) {
  return NextResponse.json({ received: true, duplicate: true });
}

switch (event.type) {
  case "checkout.session.completed": {
    const session = event.data.object as Stripe.Checkout.Session;
    // fulfill order: grant access, mark paid, etc.
    console.log(`Checkout completed: ${session.id}`);
    break;
  }
  case "payment_intent.succeeded": {
    const intent = event.data.object as Stripe.PaymentIntent;
    console.log(`PaymentIntent succeeded: ${intent.id}`);
    break;
  }
  case "invoice.payment_failed": {
    const invoice = event.data.object as Stripe.Invoice;
    console.log(`Invoice payment failed: ${invoice.id}`);
    break;
  }
  default:
    console.log(`Unhandled event type: ${event.type}`);
}
```

6. **Record the processed id and return a fast 200.** Stripe treats any non-2xx (or a slow response) as failure and retries with backoff. Acknowledge quickly; offload slow work (emails, provisioning) to a queue/background job rather than blocking the response.

```ts
  processedEvents.add(event.id);
  // production: INSERT event.id into a processed_events table (unique constraint)
  // and check existence in step 5 instead of the in-memory Set.

  return NextResponse.json({ received: true });
}
```

7. **Test locally with the Stripe CLI.** `stripe listen` prints a webhook signing secret — copy it into `STRIPE_WEBHOOK_SECRET`. `stripe trigger` fires real signed events at your route.

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET, restart the dev server
stripe trigger checkout.session.completed
```

## Gotchas

- **Raw body is mandatory.** Calling `request.json()` (or any middleware that parses the body first) re-serializes the payload, so the recomputed HMAC won't match Stripe's signature and `constructEvent` always throws. Use `await request.text()`.
- **The signing secret differs by source.** The `whsec_` from `stripe listen` is per-CLI-session and is NOT the same as the Dashboard endpoint secret. Using the dashboard secret against CLI-forwarded events (or vice versa) yields a 400 on every request.
- **Return 2xx quickly or Stripe retries.** Non-2xx responses and timeouts trigger exponential-backoff redelivery for up to ~3 days, causing duplicate processing. Ack first, do heavy work async.
- **Idempotency is required, not optional.** At-least-once delivery means the same `event.id` can hit your handler multiple times. Persist processed ids with a unique constraint; the in-memory `Set` resets on every cold start/deploy and is useless on serverless.
- **`event.data.object` is loosely typed.** It's a union; cast to the specific type (`Stripe.Checkout.Session`, etc.) per `event.type` to get correct fields, and read amounts in the smallest currency unit (cents).

## success_check

POST /api/webhooks/stripe with an invalid signature returns 400; a valid Stripe-signed test event returns 200
