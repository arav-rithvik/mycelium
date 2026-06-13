# nextjs-supabase-auth

> Set up Supabase email/password auth in the Next.js App Router using the @supabase/ssr cookie-based PKCE flow.

**Framework:** Next.js App Router (14/15)  ·  **Category:** auth  ·  **Dependencies:** `@supabase/ssr`, `@supabase/supabase-js`

## Steps

1. **Install deps and set env vars.** The anon key is safe to expose; both must be `NEXT_PUBLIC_` so the browser client can read them.

```bash
npm install @supabase/ssr @supabase/supabase-js
```

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

2. **Browser client.** Used in Client Components; reads/writes cookies via `document.cookie` automatically.

```ts
// utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

3. **Server client.** Reads cookies from `next/headers` and writes refreshed tokens back. The `setAll` try/catch is required: Server Components cannot set cookies, so the write silently no-ops there and is handled by middleware instead.

```ts
// utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies() // Next 15: cookies() is async

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore; middleware refreshes the session.
          }
        },
      },
    }
  )
}
```

4. **Middleware — refresh the session on every request.** This is the critical piece. Tokens expire; only `getUser()` here re-issues them. Cookies must be written to BOTH the request (so downstream Server Components see the new session) and the response (so the browser receives them).

```ts
// utils/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do NOT run code between createServerClient and getUser() — it triggers the refresh.
  await supabase.auth.getUser()

  return supabaseResponse
}
```

```ts
// middleware.ts  (project root)
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

5. **Sign-up / sign-in server actions.** `signUp` sends a confirmation email whose link hits `/auth/callback`; `signInWithPassword` sets the session cookies immediately.

```ts
// app/login/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signin(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) redirect('/login?error=' + encodeURIComponent(error.message))
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      emailRedirectTo: 'http://localhost:3000/auth/callback',
    },
  })
  if (error) redirect('/login?error=' + encodeURIComponent(error.message))
  redirect('/login?message=Check your email to confirm')
}
```

6. **Callback route — exchange the code for a session.** The PKCE `?code=` from the email/OAuth redirect is exchanged here, which sets the auth cookies, then redirects.

```ts
// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

7. **Read the user in a Server Component.** Always `getUser()` — it revalidates the token against Supabase's auth server. Never trust `getSession()` server-side.

```tsx
// app/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <p>Signed in as {user.email}</p>
}
```

## Gotchas

- **You MUST refresh the session in middleware.** Without `updateSession` calling `getUser()` on every request, access tokens expire (default 1h) and users get silently logged out. The middleware re-issues tokens and writes them to the response.
- **In the server client, set cookies on BOTH the request and the response.** Setting only the response means Server Components rendered in the same pass still read the stale session; setting only the request means the browser never receives the refreshed cookie.
- **Use `getUser()`, never `getSession()`, on the server.** `getSession()` reads cookies without verification and can be spoofed; `getUser()` makes an authenticated call to Supabase to validate the token. Treat any server-side `getSession()` for authz as a security bug.
- **`cookies()` is async in Next 15.** Forgetting `await` yields a broken cookie store and `getUser()` returns null. (Next 14 is sync, but `await` is forward-compatible.)
- **The callback exchange is mandatory for email confirmation and OAuth.** Skipping `/auth/callback` / `exchangeCodeForSession(code)` leaves the user with a `?code=` in the URL and no session cookie — auth appears to "do nothing."
- **Match the `matcher` and redirect URLs.** The middleware matcher must not exclude `/auth/callback`, and `emailRedirectTo` plus every redirect URL must be listed under Supabase Dashboard → Authentication → URL Configuration.

## success_check
`GET /auth/callback returns a 302 redirect and the Supabase auth cookies are set`
