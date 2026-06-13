# openai-streaming-responses

> Stream OpenAI chat completions to a React UI token-by-token from a Next.js App Router route handler.

**Framework:** Next.js App Router (14/15)  ·  **Category:** api  ·  **Dependencies:** `openai` (optionally the Vercel AI SDK `ai` + `@ai-sdk/openai`)

## Steps

### Approach A — Vercel AI SDK (fast path)

1. Install the SDK and set the key. The provider reads `OPENAI_API_KEY` from the server environment automatically.

```bash
npm i ai @ai-sdk/openai
# .env.local
# OPENAI_API_KEY=sk-...
```

2. Server route: stream from the model and return a data-stream response. `streamText` starts the OpenAI request immediately and returns without buffering; `toDataStreamResponse()` emits the protocol `useChat` understands.

```ts
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText, type CoreMessage } from 'ai';

export const runtime = 'edge'; // optional; 'nodejs' also works
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: CoreMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages,
    abortSignal: req.signal, // stop generating if the client disconnects
  });

  return result.toDataStreamResponse();
}
```

3. Client: `useChat` manages input state, POSTs to `/api/chat`, and re-renders `messages` as each token arrives.

```tsx
// app/page.tsx
'use client';
import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat();

  return (
    <div>
      {messages.map((m) => (
        <p key={m.id}><b>{m.role}:</b> {m.content}</p>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} placeholder="Say something..." />
        <button type="submit" disabled={isLoading}>Send</button>
        {isLoading && <button type="button" onClick={stop}>Stop</button>}
      </form>
    </div>
  );
}
```

### Approach B — Raw OpenAI SDK + ReadableStream (no AI SDK)

4. Server route: open a streaming completion, encode each delta, and pipe it into a `ReadableStream` so chunks flush as they arrive instead of buffering the whole reply.

```ts
// app/api/chat/route.ts
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // server-only

export async function POST(req: Request) {
  const { messages } = await req.json();

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    stream: true,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          // bail out if the browser aborted the fetch
          if (req.signal.aborted) {
            completion.controller.abort();
            break;
          }
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
    cancel() {
      completion.controller.abort(); // client closed the connection
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform', // stop proxy/CDN buffering
      'X-Accel-Buffering': 'no',
    },
  });
}
```

5. Client: read the response body as a stream and append decoded chunks to local state. `AbortController` lets the user cancel mid-stream.

```tsx
// app/page.tsx
'use client';
import { useRef, useState } from 'react';

export default function Chat() {
  const [text, setText] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  async function send() {
    setText('');
    const controller = new AbortController();
    abortRef.current = controller;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Tell me a joke.' }] }),
      signal: controller.signal,
    });
    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setText((prev) => prev + decoder.decode(value, { stream: true }));
    }
  }

  return (
    <div>
      <button onClick={send}>Send</button>
      <button onClick={() => abortRef.current?.abort()}>Stop</button>
      <p>{text}</p>
    </div>
  );
}
```

## Gotchas

- `OPENAI_API_KEY` must stay server-side. A route handler runs on the server, so reading `process.env.OPENAI_API_KEY` there is safe; never put it in a `NEXT_PUBLIC_` var or import the OpenAI client into a `'use client'` file, or it ships in the JS bundle.
- Buffering kills the effect. `await result.text()` or collecting all deltas into a string before responding defeats streaming. Enqueue each delta as it arrives. Set `Cache-Control: no-transform` and `X-Accel-Buffering: no` so Nginx/CDN layers don't hold chunks.
- Handle aborts on both ends. Without `req.signal` (SDK: `abortSignal`) / `completion.controller.abort()` in `cancel()`, a user who navigates away leaves the OpenAI generation running and billing tokens. The raw client also needs `decoder.decode(value, { stream: true })` so multi-byte UTF-8 chars split across chunks aren't corrupted.
- Approach A and B use different wire formats. `useChat` expects the AI SDK data-stream protocol (`toDataStreamResponse()`), not raw text — don't mix the AI SDK client with the raw `text/plain` route or it will not parse.
- `maxDuration` caps the function. On Vercel a long stream is cut at the platform timeout; export `maxDuration` and prefer `runtime = 'edge'` for longer streaming windows on Hobby/Pro plans.

## success_check
The /api/chat route streams text chunks and the client UI renders tokens incrementally
