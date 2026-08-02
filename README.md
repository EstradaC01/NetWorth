# NetWorth

A personal net-worth tracker in Philippine pesos. Cash, investments, property
and debt on one page, with month-by-month history, a savings goal, an activity
log and CSV export.

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
npm run verify:features   # goals, activity log, observations and CSV export
```

`verify:features` takes an optional base URL and can be pointed at a
deployment as well as at localhost:

```bash
npm run verify:features -- https://networth-ph.vercel.app
```

`verify:rls` is the one that matters most: it drives the REST API as two
authenticated users and asserts neither can read or write the other's rows.
The browser suites need a dev server running (they default to port 3947 —
pass a base URL to override).

Screenshots from the browser suites land in `scripts/screenshots/`.

## How it fits together

```
app/
  (app)/            authenticated area — dashboard, category, history, goal
  actions/          Server Actions (all mutations)
  export/           CSV download endpoint (GET; reads nothing but your own)
  login/ signup/    split-screen auth
  auth/             confirmation callback + POST sign-out
  icon.svg          the mark, as a favicon
components/         Header, ItemModal, Logo, GoalProgress, InsightStrip,
                    ActivityFeed, ExportLinks, ThemeProvider, EmptyState
lib/
  supabase/         browser, server and proxy clients
  money.ts          integer-centavo parsing and formatting
  chart.ts          SVG path maths, guarded for empty data
  dates.ts          everything in Asia/Manila
  goals.ts          progress, trend rate and arrival projection
  insights.ts       derived observations about a portfolio
  csv.ts            RFC 4180 quoting + formula-injection guard
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

**Projections refuse to guess.** A goal's arrival date is extrapolated from
the user's own recorded readings, and every function in `lib/goals.ts` returns
`null` rather than a number when the data cannot support one — fewer than two
readings, a flat trend, a trend moving away from the target, or a horizon past
50 years. The UI renders those nulls as prose. Progress is measured from the
earliest reading, not from zero: someone who started tracking at ₱2M with a
₱5M target is a third of the way there at ₱3M, not 60%.

**Observations state facts, never advice.** `lib/insights.ts` reports things
the user can verify against their own list ("Property is 88% of your assets").
It has no knowledge of anyone's circumstances, so it never recommends — a
concentrated portfolio is reported neutrally, because one house on purpose is
not a mistake.

**The activity log is append-only and denormalised.** `authenticated` is
granted `select, insert` and nothing else on `item_events`, and there are no
update or delete policies — an audit trail its own subject can rewrite is not
one. Item names and values are copied in at write time rather than joined,
because the log must survive the item being deleted, which is precisely the
event most worth explaining.

**CSV export guards against formula injection.** Excel, Sheets and LibreOffice
all evaluate a cell beginning `=`, `+`, `-` or `@`, so those are prefixed with
an apostrophe — except plain signed numbers, which are exempted so a negative
net worth still sums as a number rather than landing as text.

## Deploying to hosted Supabase

1. Create a project, then `npx supabase link --project-ref <ref>` and
   `npx supabase db push`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the
   project's API settings. Do not set `SUPABASE_SERVICE_ROLE_KEY` in any
   client-visible environment.
3. Email confirmation is on by default there, so `/auth/callback` starts being
   used — it is already implemented.
