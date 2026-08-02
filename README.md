# NetWorth

A personal net-worth tracker in Philippine pesos. Cash, investments, property
and debt on one page, with month-by-month history.

Next.js (App Router) · Supabase Postgres + Auth · TypeScript.
The visual design is the **Broadsheet** design system, vendored unchanged in
`public/broadsheet/styles.css`.

## Running it locally

Requires Node 20+ and Docker (for the local Supabase stack).

```bash
npm install
npx supabase start          # Postgres + Auth in Docker; prints local keys
npx supabase db reset       # applies supabase/migrations/
npm run dev
```

`.env.local` is already pointed at the local stack. The values in it are
Supabase's standard local development keys — they are public by design and
carry no access to anything outside your machine.

Useful local endpoints once the stack is up:

| Service | URL |
| --- | --- |
| App | http://localhost:3000 |
| Supabase Studio | http://127.0.0.1:54323 |
| Mailpit (confirmation emails) | http://127.0.0.1:54324 |

Sign up with any email — local Supabase has email confirmation disabled, so
sign-up logs you straight in. New accounts start empty.

## Verification

```bash
npm run verify:lib        # money, chart and date helpers
npm run verify:rls        # per-user isolation, proven at the database
npm run verify:e2e        # full user journey in a real browser
npm run verify:history    # multi-month chart, seeded with backdated snapshots
```

`verify:rls` is the one that matters most: it drives the REST API as two
authenticated users and asserts neither can read or write the other's rows.
The browser suites need a dev server running (they default to port 3947 —
pass a base URL to override).

Screenshots from the browser suites land in `scripts/screenshots/`.

## How it fits together

```
app/
  (app)/            authenticated area — dashboard, category, history
  actions/          Server Actions (all mutations)
  login/ signup/    split-screen auth
  auth/             confirmation callback + POST sign-out
components/         Header, ItemModal, ThemeProvider, EmptyState
lib/
  supabase/         browser, server and proxy clients
  money.ts          integer-centavo parsing and formatting
  chart.ts          SVG path maths, guarded for empty data
  dates.ts          everything in Asia/Manila
  data.ts           server-side reads + snapshot recording
supabase/migrations/  schema, grants, RLS policies
_prototype/         the original Claude Design export, kept for reference
```

Reads happen in Server Components so the net-worth figure is in the initial
HTML; all interactivity (hover, range toggles, legend, modal) is client state
over that data. Mutations go through Server Actions.

### Design notes

**Money is stored as integer centavos** (`bigint`), never a float. Input is
parsed with integer arithmetic and malformed values are rejected rather than
coerced — the prototype's `parseFloat` accepted `1-2-3` as `1`.

**History is never fabricated.** The `snapshots` table records real monthly
readings, upserted when you change something and when you load the dashboard.
A new account therefore has no chart until its second month, and says so.
The original prototype synthesised 18 months of plausible-looking history from
today's totals, which for a financial record is worse than showing nothing.

**Row Level Security is the security boundary.** Every policy is
`auth.uid() = user_id`; the proxy redirect is convenience, not protection.
`service_role` bypasses RLS and must never reach the browser.

**Dates are Asia/Manila.** A snapshot month is a calendar month there — keying
off UTC would file an item added at 07:00 on the 1st into the previous month.

## Deploying to hosted Supabase

1. Create a project, then `npx supabase link --project-ref <ref>` and
   `npx supabase db push`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the
   project's API settings. Do not set `SUPABASE_SERVICE_ROLE_KEY` in any
   client-visible environment.
3. Email confirmation is on by default there, so `/auth/callback` starts being
   used — it is already implemented.
