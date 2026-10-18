# Township Green Loop

**Residents fund their township's green assets, and get paid back in ringgit,
points and cleaner air.**

Sime Darby Property University Hackathon 2026 · Theme: Planet
Live demo: https://township-green-loop-capybara.vercel.app

---

## The problem

A Malaysian township has money sitting on one side of it and green projects
needing money on the other, and nothing connects them.

**Residents' savings earn almost nothing.** A 12-month fixed deposit board rate
is about 1.9%. EPF paid 6.15% for 2025. In between, there is no way for someone
with RM500 to put it into something local, visible and green.

**Green assets are funded with expensive money.** A developer/JV funding rooftop
solar from its own balance sheet needs roughly 8.5% a year. Residents would
accept 5% for the same asset, because they also get the township.

**Mall shops want lower bills but have no capital.** Efficient air-conditioning,
fridges and LED cost about RM20,000 per shop. The saving is real — about RM1,000
a month — but the upfront cost stops it.

**Nothing in the market fits.** Green SRI sukuk is institutional. Equity
crowdfunding is start-up equity, not local green assets. Mall loyalty apps let
you spend, never invest. SDP's own CREAM rooftop leasing only works if you own a
roof — which excludes condo owners and renters.

**Community programmes are hard to measure.** Paper sign-ups and manual reports
make it difficult to prove engagement for ESG reporting.

---

## The solution

One app where a township's residents invest in its own green assets, earn from
them, and spend the returns back inside the township.

### 1. Three investment pools, from RM100

| Pool | Return | Payback | Cap per person | Risk |
| --- | --- | --- | --- | --- |
| Rooftop Solar | 5% a year, 4.5% floor | 5 years, monthly | RM2,000 | Low |
| Shop Energy Upgrades | 6.5% a year | 3 years, monthly | RM1,000 | Medium |
| EV Charging | ~6.6%, not guaranteed | 7 years | RM500 | **High — capital can fall** |

Residents are **funders, not landlords**. The developer/JV owns and runs the
panels; tenants pay for the power and residents are paid first. Money is held in
trust by a licensed market operator — the app never touches it.

Over each pool's full payback period that is **+13.2%**, **+10.3%** and
**+28.7%**. The app shows the conservative case beside it, including the EV
pool's **−40%**, before anyone confirms.

### 2. The loop back into the township

Monthly payouts land in an in-app wallet. Spend them at a township mall and the
credit is worth **10% more**, funded by the participating shops — so the
developer gains footfall at no cost, and the money stays local.

### 3. Points for green actions, not for spending

Recycling drop-offs, community events and cutting your own household electricity
by 10%+ earn points. Points buy mall rewards.

Two design decisions protect this:

- **A poster code alone awards nothing.** Codes get photographed and shared, so a
  resident *asks* to check in and a township admin confirms attendance before any
  points are written.
- **Badges reward green actions only.** Wallet money can be turned into points
  (20 per RM1), but those points never climb the badge ladder. You cannot buy
  your way to Planet Hero.

Five levels — Seedling, Green Neighbour, Eco Champion, Township Guardian, Planet
Hero — appear beside your name in the community.

### 4. Residents first, supporters welcome

Someone who grew up in the township, works there, or has family there can invest
as a **supporter**. They get the same pools, rates and caps, but activity
check-ins stay with people who physically turn up. Residents keep priority for
the first 14 days of every raise and at least 70% of each pool.

### 5. Transparency as a feature

- A **risk management page** showing the whole chain: resident → licensed
  operator → asset owner → who pays you back, plus what is explicitly *not*
  covered.
- **Carbon shown before you invest** — your share of the asset's tCO₂e a year,
  computed from your stake against its funding target.
- Every limit — pool caps, RM3,500 across all pools, RM50,000 per 12 months — is
  enforced by a **database trigger**, and its error text is shown to the user
  word for word. The app cannot talk its way around the rules.

### 6. Sprout, the in-app helper

A Claude Haiku agent that answers questions about pools, points, bills, rewards
and badges using only the township's real figures and the signed-in user's own
data. It is told never to invent a rate and always to flag the EV pool's risk.

Sprout degrades rather than fails. If the model cannot be reached, a scripted
layer answers the common questions from the same database rows the model would
have read, so the helper keeps working during an outage instead of apologising.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS v4, Inter |
| Database & auth | Supabase (Postgres, Row Level Security, cookie sessions) |
| Charts | Recharts |
| Icons / QR | lucide-react, qrcode.react |
| AI | Claude Haiku 5.5 (`@anthropic-ai/sdk`), streamed, prompt-cached |
| Bill OCR | Claude Haiku 5.5 vision, structured JSON output |
| Hosting | Vercel |

Everything runs on free tiers.

## System architecture

```
                 ┌──────────────────────────────────────────┐
  Browser  ─────►│  Next.js on Vercel                       │
  (PWA)          │                                          │
                 │  middleware.ts                           │
                 │    refreshes the session, routes by role │
                 │                                          │
                 │  Server Components ── read via SSR client│
                 │  Server Actions ───── write via SSR client│
                 │  /api/agent ───────── Claude, streamed   │
                 │  /api/scan-bill ───── Gemini vision      │
                 │  /api/report ──────── CSV export         │
                 └───────────────┬──────────────────────────┘
                                 │ publishable key only
                                 ▼
                 ┌──────────────────────────────────────────┐
                 │  Supabase Postgres                       │
                 │                                          │
                 │  RLS on every table                      │
                 │  SECURITY DEFINER functions for anything │
                 │    crossing a user boundary              │
                 │  Triggers enforce the investment rules   │
                 │  Private storage: bills, check-in proofs │
                 └──────────────────────────────────────────┘
```

**Security model.** The app only ever holds the publishable key — the
service-role key is never used and never deployed. Authorisation lives in the
database, not the UI: RLS decides what each row-owner can see, and
`SECURITY DEFINER` functions gate everything else (`is_admin()`,
`merchant_accept_code()`, `review_checkin()`). Role checks in middleware are a
convenience so nobody lands on an empty page, not a security boundary.

**Rules live in Postgres.** Pool minimums and maximums, the RM50,000 rolling
limit, the risk-acknowledgement requirement, badge thresholds and energy-saving
points are all triggers and functions. Changing the UI cannot change the rules.

**Three roles, one database.** `resident` (with `membership` of resident or
supporter), `merchant`, `developer_admin`. One shared community space; everything
else scoped by role.

### Schema

| File | Adds |
| --- | --- |
| `setup_all.sql` | Core: profiles, pools, assets, investments, payouts, wallet, points, rewards, shops, RLS |
| `setup_v2.sql` | Badges, check-in approval, feedback, community, promotions, payment methods |
| `setup_v3.sql` | Supporter membership |
| `setup_v4.sql` | Final-plan caps, activity editing, feedback replies, CSV reports |
| `setup_v5.sql` | Badges from green actions only, resident priority |
| `setup_v6.sql` | Membership in the community feed |
| `setup_v7.sql` | Twelve-month trends |

Run in order. Each is re-runnable.

---

## Impact

Per township developer, modelled over five years:

| | Year 1 | Year 5 |
| --- | --- | --- |
| Raised from residents | RM3.2m | RM5.0m |
| Residents' profit | RM82,163 | RM636,880 |
| Solar running | 1.5 MW | 17.5 MW |
| **CO₂ avoided a year** | **1,534 tCO₂e** | **16,921 tCO₂e** |

Reaching **20 MW in five years**, matching the SDP × GSPARX JV target.

**For residents** — 5–6.5% on the low-risk pools against a ~1.9% fixed deposit,
from RM100, in assets they can walk past.

**For the developer** — net gain from Year 1, cheaper capital for solar (5% to
residents instead of 8.5% own money), higher mall footfall through the +10%
bonus, tenant retention through lower shop bills, and auditable carbon and
engagement data for the sustainability report.

**For shop tenants** — about 25% off the electricity bill with no capital, and
100% of the saving once the three years are up.

**For the planet** — the carbon is the point. Every figure above is computed from
the grid emission factor for Peninsular Malaysia (0.74 tCO₂e/MWh) against real
asset sizes, and each resident sees their own share of it before they invest.

---

## Running it

Needs Node.js 20+.

```bash
npm install
cp .env.example .env.local   # fill in the keys
npm run dev                  
```

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
ANTHROPIC_API_KEY=           # optional — Sprout falls back to scripted
                             # answers and bill scanning asks you to type
```

The Supabase `service_role` key is not used anywhere and must not be added.

## Demo accounts

Password `123456` for all of them. The sign-in page lists these and fills the
form when you tap one.

| Account | Who | What to look at |
| --- | --- | --- |
| `zara@demo.com` | Zara Abdullah, resident | The full picture: RM3,500 across all pools, every badge, payouts, bills, rewards |
| `mei@demo.com` | Mei Ling Tan, resident | Her first badge is unopened — the celebration fires on sign-in |
| `supporter@demo.com` | Nurul Hidayah, supporter | Invests from Penang; check-ins are closed to her |
| `shop@demo.com` | Kopi Hijau Café | Accept a code, shop energy dashboard, offers to accept or decline |
| `admin@demo.com` | Township team | Approve check-ins, run a payout, propose offers, moderate, reports |

### Five-minute walkthrough

1. **Zara** → Invest → pick a pool → read the risk statement → see the carbon
   share → confirm.
2. **Points** → ask to check in to a recycling drop-off.
3. **Admin** → Check-in requests → approve it. One request has a deliberately
   wrong code, flagged red.
4. **Admin** → Run demo payout → the KPIs and trends move.
5. **Zara** → Wallet → spend RM10 at KL East Mall → an RM11 credit with a QR.
6. **Shop** → paste that code → "Mall credit accepted". Try it twice; it refuses.
7. **Supporter** → Points → no check-in form, with the reason given.
8. **Sprout** → "Which pool suits RM1,000 and low risk?"

## Deploying

Import the repo on Vercel, add the three environment variables, deploy. Then set
the Supabase **Site URL** to the deployment URL under Authentication → URL
Configuration.

Free Supabase projects pause after 7 idle days, so
[.github/workflows/keepalive.yml](.github/workflows/keepalive.yml) reads one row
every 3 days. It needs the repo secret `SUPABASE_PUBLISHABLE_KEY`.
