# Township Green Loop – build brief for Claude Code

Hackathon: Sime Darby Property University Hackathon 2026 ("Township of Tomorrow", Planet theme). Deadline 23 Oct 2026.
Goal: a working, publicly reachable PWA demo (Vercel) on top of an existing Supabase database. Demo data only – no real money.

## Stack (all free tier)
- Next.js (App Router, TypeScript), Tailwind CSS, `@supabase/supabase-js` + `@supabase/ssr` (cookie-based auth, middleware refresh).
- Charts: `recharts`. Icons: `lucide-react`. QR: `qrcode.react`.
- PWA: `app/manifest.ts` + icons; installable on phone.
- AI: Claude Haiku 5.5 (`@anthropic-ai/sdk`) via server routes — `app/api/agent/route.ts` (Sprout, streamed) and `app/api/scan-bill/route.ts` (bill OCR). Key in `ANTHROPIC_API_KEY` (server only). If the key is missing the app must still work: Sprout answers from `lib/sprout-script.ts` using real database figures, and bill scanning asks the resident to type the numbers.
- Deploy: GitHub `Pyyp0409/Township-Green-Loop-Capybara` → Vercel.

## Environment (`.env.local`, never commit; same values in Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://ltqsoufxniolxzzfzswj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
ANTHROPIC_API_KEY=<server only>
```
Never use or ask for the service_role / secret key. All security is enforced by RLS + the database functions below.

## Database (ALREADY CREATED – do not recreate; full SQL in `supabase/setup_all.sql`)
Tables (public schema, RLS on):
- `profiles` (id = auth user id, full_name, role: resident | merchant | developer_admin, township). Users may update full_name, township only.
- `pools` (id: solar | upgrade | ev, name, risk, rate, rate_type, payback_years, min_invest, max_invest, description, risk_text) – public read.
- `assets` (pool_id, name, mall_id, size_kw, funding_target, status raising|running|repaid, kwh_per_year, co2_t_per_year, note) – public read.
- `investments` (user_id, pool_id, asset_id, amount, status, created_at) – insert own. A DB trigger enforces: risk acknowledged for that pool, pool min/max per resident, RM50,000 per 12 months. Show the trigger's error message to the user as-is.
- `risk_acknowledgements` (user_id, pool_id, version) – insert own BEFORE first investment in a pool.
- `payouts` (investment_id, user_id, amount, kind profit|principal|top_up, paid_at) – read own.
- `wallet_transactions` (user_id, amount ±, kind payout|mall_spend|withdrawal, note) – read own.
- `mall_credits` (user_id, mall_id, wallet_amount, bonus, value, code, status issued|used) – read own.
- `energy_bills` (user_id, bill_month (1st of month), kwh, amount_rm, file_path) – full CRUD on own. Bill files go to private storage bucket `bills` at path `<user_id>/<filename>`.
- `activities` (title, kind recycling|event|energy_saving, points, location, starts_at, checkin_code) – public read. Never show `checkin_code` to residents (it is printed on the QR poster).
- `point_transactions` (user_id, points ±, reason, activity_id, bill_id) – read own.
- `malls`, `rewards` (mall_id, title, points_cost, stock, active) – public read.
- `redemptions` (user_id, reward_id, points_used, code, status) – read own.
- `shops` (mall_id, merchant_id, name, category, upgraded), `shop_energy` (shop_id, month, kwh, baseline_kwh, bill_rm, saving_rm) – merchants see their own shop.

RPC functions (call with `supabase.rpc(...)`):
- `my_points()` → int; `my_wallet()` → numeric
- `check_in(p_activity_id, p_code)` → points earned (errors: wrong code, already checked in)
- `redeem_reward(p_reward_id)` → redemption row with `code`
- `spend_at_mall(p_mall_id, p_amount)` → mall credit (+10% bonus paid by shops) with `code`
- `merchant_accept_code(p_code)` → text (merchant only)
- `run_demo_payouts(p_paid_at date)` → count (admin only; pays one month to every active investment)
- `admin_overview()` → json (admin only); `township_impact()` → json (public); `asset_progress()` → table (public)
Energy-saving points are awarded automatically by a trigger when a new bill is ≥10% below last month's.

Demo users (already created): resident@demo.com, admin@demo.com (developer_admin), shop@demo.com (merchant, owns "Kopi Hijau Café").

## Pages (sitemap)
Public
- `/` landing: what it is, live `township_impact()` numbers (RM raised, investors, tCO2e/yr, solar kWp), the 3 pools, "Sign in".
- `/login` email + password (Supabase Auth). After login, route by role.

Resident (`/app/...`, bottom tab bar on mobile)
- `/app` Home: wallet RM, points, total invested, next payout, CO2 share, quick actions.
- `/app/invest` 3 pool cards (risk badge, rate, payback, min–max) → `/app/invest/[pool]` detail: assets + funding progress bar, returns example (amount × rate), **risk statement checkbox** (inserts risk_acknowledgements), amount input, confirm.
- `/app/portfolio` investments by pool, payouts history, chart of cumulative payouts.
- `/app/wallet` balance, transactions, "Spend at mall" (choose mall + amount → shows credit value with +10% and a QR of the code), my mall credits.
- `/app/points` balance, activities list, "Check in" (enter or scan code), history.
- `/app/bills` add monthly bill (kWh, RM, optional photo/PDF upload), kWh trend chart, message when energy-saving points were earned.
- `/app/rewards` catalogue by mall, redeem, "My codes" with QR.
- `/app/advisor` AI chat: server route builds context from the user's own pools/investments/bills (no other users' data), answers in simple English, always adds "This is not financial advice". Never invents returns – use the pool rates from the DB.

Merchant (`/shop`)
- Accept code (input or camera QR) → `merchant_accept_code`; shop energy dashboard (kWh vs baseline, RM saved, chart).

Developer admin (`/admin`)
- Overview from `admin_overview()` (residents, investors, raised by pool, paid out, points issued, mall credits, CO2/yr), assets table with progress, "Run demo payout for <month>" button, manage activities (show check-in codes + printable QR poster) and rewards.

## Rules
- Mobile-first, clean, green/teal palette; works at 360px width. Use RM formatting `RM1,234.56`.
- Every money screen shows: "Demo only. Not a deposit; not covered by PIDM. Investments are offered through a licensed platform."
- EV pool must always show "High risk – capital not guaranteed".
- Server components fetch with the server Supabase client; mutations via server actions or client calls – RLS does the security, but also check role in middleware for `/admin` and `/shop`.
- No secrets in the repo. `.env.local` stays in `.gitignore`.
- Keep a Supabase keep-alive: GitHub Action `.github/workflows/keepalive.yml` that GETs `/rest/v1/pools?select=id&limit=1` with the publishable key every 3 days (free projects pause after 7 idle days). Store the key as repo secret `SUPABASE_PUBLISHABLE_KEY`.

## Build order
1. Scaffold Next.js + Tailwind, Supabase clients (browser/server/middleware), login, role routing.
2. Resident: Home → Invest (with risk ack) → Portfolio → Wallet → Points → Bills → Rewards.
3. Admin overview + run payouts; Merchant accept code + shop energy.
4. AI advisor route + page.
5. PWA manifest/icons, keep-alive workflow, README (setup + demo accounts + screenshots), deploy to Vercel.
After each step: `npm run build` must pass, then test with the three demo accounts.
