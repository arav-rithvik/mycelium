# tailwind-dark-mode

> Class-based Tailwind dark mode in the Next.js App Router with a no-flash theme toggle persisted to localStorage.

**Framework:** Next.js App Router (14/15) + Tailwind CSS · **Category:** frontend · **Dependencies:** `tailwindcss` (optionally `next-themes`)

## Steps

1. **Enable class-based dark mode.** Tailwind toggles the `dark:` variant off a `.dark` class on an ancestor instead of the OS media query.

   Tailwind v3 — `tailwind.config.ts`:

   ```ts
   // tailwind.config.ts
   import type { Config } from "tailwindcss";

   export default {
     darkMode: "class",
     content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
   } satisfies Config;
   ```

   Tailwind v4 — there is no JS `darkMode` key; declare the variant in your CSS entry instead:

   ```css
   /* app/globals.css */
   @import "tailwindcss";
   @custom-variant dark (&:where(.dark, .dark *));
   ```

2. **Add the no-flash blocking script to the root layout `<head>`.** THE KEY PART. This runs synchronously before first paint, reads the saved choice (falling back to the OS preference), and sets `.dark` on `<html>` so the page paints in the correct theme immediately. A `useEffect` cannot do this — it runs after hydration, so the browser paints the wrong theme first (FOUC). `suppressHydrationWarning` silences the unavoidable mismatch from the server not knowing the client's theme.

   ```tsx
   // app/layout.tsx
   const themeScript = `
   (function () {
     try {
       var t = localStorage.getItem('theme');
       var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
       document.documentElement.classList.toggle('dark', dark);
     } catch (e) {}
   })();
   `;

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en" suppressHydrationWarning>
         <head>
           <script dangerouslySetInnerHTML={{ __html: themeScript }} />
         </head>
         <body>{children}</body>
       </html>
     );
   }
   ```

3. **Build a client-side toggle that flips the class and persists the choice.** It writes to `localStorage` (read by the script on the next load) and toggles the class live so the change is instant.

   ```tsx
   // components/theme-toggle.tsx
   "use client";
   import { useEffect, useState } from "react";

   export function ThemeToggle() {
     const [dark, setDark] = useState(false);

     // Sync UI state to the class the blocking script already set.
     useEffect(() => {
       setDark(document.documentElement.classList.contains("dark"));
     }, []);

     function toggle() {
       const next = !dark;
       setDark(next);
       document.documentElement.classList.toggle("dark", next);
       localStorage.setItem("theme", next ? "dark" : "light");
     }

     return (
       <button onClick={toggle} aria-label="Toggle theme">
         {dark ? "Light" : "Dark"}
       </button>
     );
   }
   ```

4. **Use `dark:` variants in markup.** Pair every light value with its dark counterpart; the variant activates whenever a `.dark` ancestor exists.

   ```tsx
   // app/page.tsx
   export default function Page() {
     return (
       <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
         <h1 className="text-2xl font-bold">Hello</h1>
       </main>
     );
   }
   ```

5. **Shorter alternative — `next-themes`.** Prefer this once you need multiple themes, system-change reactivity, or want the flash logic maintained for you. It injects its own blocking script, so you do not write step 2.

   ```bash
   npm install next-themes
   ```

   ```tsx
   // app/providers.tsx
   "use client";
   import { ThemeProvider } from "next-themes";

   export function Providers({ children }: { children: React.ReactNode }) {
     return (
       <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
         {children}
       </ThemeProvider>
     );
   }
   ```

   ```tsx
   // app/layout.tsx — wrap children, keep suppressHydrationWarning
   import { Providers } from "./providers";
   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en" suppressHydrationWarning>
         <body>
           <Providers>{children}</Providers>
         </body>
       </html>
     );
   }
   ```

   ```tsx
   // components/theme-toggle.tsx
   "use client";
   import { useTheme } from "next-themes";
   import { useEffect, useState } from "react";

   export function ThemeToggle() {
     const { resolvedTheme, setTheme } = useTheme();
     const [mounted, setMounted] = useState(false);
     useEffect(() => setMounted(true), []); // avoid SSR mismatch; theme is unknown until mounted
     if (!mounted) return null;
     return (
       <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
         {resolvedTheme === "dark" ? "Light" : "Dark"}
       </button>
     );
   }
   ```

## Gotchas

- **The flash (FOUC) is only fixable with a render-blocking inline script in `<head>`.** Any React-based approach (`useEffect`, context, a client component) runs _after_ the server HTML paints, so users see the wrong theme for a frame on every load. The script must be inline (not `src=...`) and not deferred so it executes before paint.
- **`suppressHydrationWarning` is mandatory on `<html>` and only suppresses one level.** The server cannot know the client's theme, so the `class`/`style` on `<html>` legitimately differs after the script runs. It silences exactly that node — it will not hide mismatches inside your tree, so don't render theme-dependent text on the server (gate it behind a `mounted` flag).
- **Tailwind v4 dropped the JS `darkMode: 'class'` key.** If you upgraded and `dark:` stopped working, you need `@custom-variant dark (&:where(.dark, .dark *));` in your CSS entry instead. Mixing a v3 config with a v4 install silently does nothing.
- **`prefers-color-scheme` is the fallback, not the source of truth.** Read `localStorage('theme')` first; only fall back to the media query when nothing is stored. Otherwise a user who explicitly chose light gets overridden when their OS is dark.
- **Read the class, don't assume `false`, when initializing toggle state.** The blocking script may have already set `.dark`; initialize the button from `document.documentElement.classList.contains('dark')` in a `useEffect` so the icon matches reality on first paint.

## success_check

Toggling the theme adds/removes the 'dark' class on <html> and the choice survives reload with no flash of the wrong theme
