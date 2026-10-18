# Township Green Loop

Residents fund their township's rooftop solar, mall shop energy upgrades and EV
charging — and earn back in ringgit, points and cleaner air.

Built for the **Sime Darby Property University Hackathon 2026** ("Township of
Tomorrow", Planet theme). An installable mobile-first PWA on Next.js and Supabase.

> **Demo only. Not a deposit; not covered by PIDM. Investments are offered through
> a licensed platform.** No real money moves through this app and every shop,
> asset and resident in it is fictional.

## The loop

1. **Invest** — from RM100 into Rooftop Solar (5%/yr), Shop Energy Upgrades
   (6.5%/yr) or EV Charging (6.6%/yr, high risk, capital not guaranteed).
2. **Earn** — monthly payouts land in the in-app wallet.
3. **Collect points** — recycling, community events, and cutting your own
   household electricity by 10%+ versus last month.
4. **Spend at the mall** — wallet money becomes a mall credit worth 10% more,
   funded by the participating shops, redeemed at the till by QR.

## Run it locally

Needs Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # fill in the publishable key
npm run dev                  # http://localhost:3000
```

`.env.local` is git-ignored:

```
NEXT_PUBLIC_SUPABASE_URL=https://ltqsoufxniolxzzfzswj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
GEMINI_API_KEY=            # optional — the advisor says "offline" without it
```

Never add the Supabase `service_role` key. All security is enforced by row level
security and `security definer` database functions.

## Demo accounts

| Email | Role | Lands on |
| --- | --- | --- |
| `resident@demo.com` | resident | `/app` |
| `shop@demo.com` | merchant (Kopi Hijau Café) | `/shop` |
| `admin@demo.com` | developer_admin | `/admin` |

Middleware keeps each role inside its own area and sends the others home.

## Demo script (about 5 minutes)

1. Landing page → live township numbers → **Sign in** as `resident@demo.com`.
2. **Invest** RM500 in Rooftop Solar — tick the risk statement — see it in
   **Portfolio**.
3. **Points** → check in to "Recycling drop-off" with code `RECYCLE` → +20 points.
4. **Bills** → add August, then September with 10%+ fewer kWh → +150 points,
   awarded by a database trigger, not by the app.
5. **Rewards** → redeem "Free 1-hour parking" → QR code.
6. Sign in as `admin@demo.com` → **Run demo payout** → the KPIs move.
7. Back as the resident → the wallet now holds the payout → **Spend at mall**
   RM10 at KL East Mall → an RM11 credit with a QR.
8. Sign in as `shop@demo.com` → type that code → "Mall credit accepted".
9. **Advisor** → "Which pool suits RM1,000 and low risk?"

## Architecture

```
app/
  page.tsx                 landing: township_impact(), the three pools
  login/                   email + password, redirect by role
  app/                     RESIDENT — tab bar: Home · Invest · Wallet · Points · More
    invest/[pool]/         assets, funding progress, risk acknowledgement, invest
    portfolio/             holdings, payout history, cumulative chart
    wallet/                balance, spend at mall (+10%), credits with QR
    points/                balance, activities, check-in by code, history
    bills/                 add a bill (+ private upload), kWh chart
    rewards/               catalogue by mall, redeem, my codes
    advisor/               AI chat
    profile/               full_name and township only
  shop/                    MERCHANT — accept code, shop energy dashboard
  admin/                   ADMIN — KPIs, assets, run payouts
    activities/            check-in codes + printable QR posters
    rewards/               catalogue management
  api/advisor/             Gemini route, this user's own data only
lib/supabase/              browser · server · middleware clients
middleware.ts              session refresh + role routing
```

Server components read through the server Supabase client; writes go through
server actions. Row level security is the real boundary — the role checks in
middleware only stop people landing on a page that would be empty for them.

Errors raised by database triggers (pool minimum and maximum, the RM50,000 per
12 months retail limit, "Wrong check-in code", "Not enough in wallet") are shown
to the user **as-is**, because the database is the single source of those rules.

Activity `checkin_code` values are only ever read on `/admin/activities`, where
they are printed on the QR poster. Resident-facing queries select explicit
columns so the code cannot leak.

## Database

Already provisioned in Supabase (Singapore). The full schema, RLS policies,
functions and demo data are in [supabase/setup_all.sql](supabase/setup_all.sql) —
it does not need to be run again.

Key RPCs: `township_impact()`, `asset_progress()`, `my_points()`, `my_wallet()`,
`check_in(id, code)`, `redeem_reward(id)`, `spend_at_mall(mall, amount)`,
`merchant_accept_code(code)`, `run_demo_payouts(date)`, `admin_overview()`.

Bill uploads go to the private `bills` bucket at `<user_id>/<filename>`.

## Deploying to Vercel

1. Push to GitHub, then import the repo at vercel.com (sign in with GitHub).
2. Add three environment variables for **Production, Preview and Development**:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `GEMINI_API_KEY`.
3. Deploy, then in Supabase → **Authentication → URL Configuration** set the
   Site URL to the Vercel URL and add it to Redirect URLs.
4. Add the repo secret `SUPABASE_PUBLISHABLE_KEY` in GitHub → Settings → Secrets
   and variables → Actions, so the keep-alive workflow can run.

## Keep-alive

Free Supabase projects pause after 7 idle days.
[.github/workflows/keepalive.yml](.github/workflows/keepalive.yml) reads one row
from `pools` every 3 days. Run it once by hand from the Actions tab after adding
the secret, to confirm it returns HTTP 200.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase
(`@supabase/supabase-js`, `@supabase/ssr`) · Recharts · lucide-react ·
qrcode.react · Google Gemini Flash (`@google/genai`).
