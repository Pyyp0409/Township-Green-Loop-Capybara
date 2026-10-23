# Township Green Loop — Knowledge File

**Purpose of this file.** Everything needed to produce a pitch deck, a video
script, a poster or a written submission for Township Green Loop, without
opening the codebase. Every figure here is taken from the working app, the
database, or `Township_Green_Loop_Business_Plan_Final.xlsx`. Nothing is
estimated or invented.

**If you are an AI assistant reading this:** do not add numbers that are not in
this file. If a figure you want is missing, say so rather than filling the gap.
The credibility of this submission rests on every number being traceable.

---

## 1. Fast facts

| | |
| --- | --- |
| **Name** | Township Green Loop |
| **One line** | Residents fund their township's green assets, and get paid back in ringgit, points and cleaner air. |
| **Event** | Sime Darby Property University Hackathon 2026 |
| **Theme** | "Township of Tomorrow" — Planet |
| **Deadline** | 23 October 2026 |
| **Live demo** | https://township-green-loop-capybara.vercel.app |
| **Repository** | github.com/Pyyp0409/Township-Green-Loop-Capybara |
| **Status** | Working PWA, publicly reachable, 38 routes, three user roles |
| **Data** | Demo data only. No real money moves. |

---

## 2. The problem

A Malaysian township has money sitting on one side of it and green projects
needing money on the other, and nothing connects them.

**Residents' savings earn almost nothing.**
A 12-month fixed deposit board rate is about **1.9%**. EPF paid **6.15%** for
2025. In between, there is no way for someone with RM500 to put it into
something local, visible and green.

**Green assets are funded with expensive money.**
A developer or JV funding rooftop solar from its own balance sheet needs roughly
**8.5% a year**. Residents would accept **5%** for the same asset, because they
also get the township. *This gap is the entire thesis — both sides end up better
off, so the scheme does not depend on anyone's goodwill.*

**Mall shops want lower bills but have no capital.**
Efficient air-conditioning, fridges and LED cost about **RM20,000 per shop**.
The saving is real — about **RM1,000 a month** — but the upfront cost stops it.

**Nothing in the market fits.**
- Green SRI sukuk — institutional only
- Equity crowdfunding — start-up equity, not local green assets
- Mall loyalty apps — let you spend, never invest
- SDP's own CREAM rooftop leasing — only works if you own a roof, which excludes
  every condo owner and renter

**Community programmes are hard to measure.**
Paper sign-ups and manual reports make it difficult to prove engagement for ESG
reporting.

---

## 3. The solution

One app where a township's residents invest in its own green assets, earn from
them, and spend the returns back inside the township.

### 3.1 Three investment pools, from RM100

| Pool | Return | Payback | Cap per person | Risk |
| --- | --- | --- | --- | --- |
| **Rooftop Solar** | 5% a year, 4.5% floor | 5 years, monthly | RM2,000 | Low |
| **Shop Energy Upgrades** | 6.5% a year | 3 years, monthly | RM1,000 | Medium |
| **EV Charging** | ~6.6%, not guaranteed | 7 years | RM500 | **High — capital can fall** |

**Total returned per RM1 invested, over the full payback period** (includes
your capital back):

| Pool | Normal case | Conservative case | What the conservative case assumes |
| --- | --- | --- | --- |
| Solar | **1.132×** (+13.2%) | **1.132×** (unchanged) | The JV passes part of its funding saving to back a 4.5% floor, so the stress test does not move this pool |
| Upgrades | **1.103×** (+10.3%) | **1.051×** (+5.1%, ≈3.2%/yr) | Shop defaults rise from 2% to 10% a year. You still finish ahead, but earn roughly half |
| EV | **1.287×** (+28.7%) | **0.60×** (**−40%**) | Usage halves to 30 kWh a day per charger. You get back about 60% of your money — a real loss |

**The conservative case is shown in the app, next to the normal one, before
anyone confirms.** This is a deliberate design choice and worth saying out loud.

**Pool-specific facts worth quoting:**
- *Solar* — residents are **funders, not roof landlords**. The developer/JV owns
  and runs the panels; tenants, malls and factories pay for the power, and
  residents are paid first.
- *Upgrades* — repaid from **80% of the bill savings**. The installer contract
  guarantees a minimum saving of **RM800 per shop per month**. Totals are already
  net of expected defaults and the bad-debt reserve.
- *EV* — the thinnest pool. A licensed charge point operator **co-invests half**
  and runs the chargers. Developer and platform take their 10% shares **only
  after residents get their money back**. If usage falls below 60 kWh a day,
  partners top up, capped at RM3,000 per charger a year. Price wars, cost rises
  and a refused government grant are **not** covered.

**Limits:** RM3,500 across all three pools at once (2,000 + 1,000 + 500);
RM50,000 per rolling 12 months; RM10,000 per issuer.

### 3.2 The loop back into the township

Monthly payouts land in an in-app wallet. Spend them at a township mall and the
credit is worth **10% more**, funded by the participating shops — so the
developer gains footfall at no cost, and the money stays local.

```
Resident invests  →  Asset generates  →  Monthly payout  →  Wallet
      ↑                                                        │
      └──────  Mall shops fund the +10%  ←  Spent at mall  ←───┘
```

### 3.3 Points for green actions, not for spending

Recycling drop-offs, community events and cutting your own household electricity
by 10%+ earn points. Points buy mall rewards.

Two design decisions protect this:

- **A poster code alone awards nothing.** Codes get photographed and shared, so a
  resident *asks* to check in and a township admin **confirms attendance** before
  any points are written.
- **Badges reward green actions only.** Wallet money can be turned into points
  (20 per RM1, one way, never back), but those points **never climb the badge
  ladder**. You cannot buy your way to Planet Hero.

Five levels: **Seedling → Green Neighbour → Eco Champion → Township Guardian →
Planet Hero**. They appear beside your name in the community space.

### 3.4 Residents first, supporters welcome

Someone who grew up in the township, works there, or has family there can invest
as a **supporter**. Same pools, rates and caps. But activity check-ins stay with
people who physically turn up. Residents keep **priority for the first 14 days**
of every raise and **at least 70% of each pool**.

*Why this exists:* the township-only version excluded people with a real stake —
family, former residents, people who work there. Inclusion without diluting
residents' claim on their own township.

### 3.5 Transparency as a feature

- A **risk management page** showing the whole chain: resident → licensed
  operator → asset owner → who pays you back, plus what is explicitly *not*
  covered.
- **Carbon shown before you invest** — your share of the asset's tCO₂e a year,
  computed from your stake against its funding target.
- Every limit is enforced by a **database trigger**, and its error text is shown
  to the user word for word. The app cannot talk its way around the rules.

### 3.6 Sprout, the in-app helper

A **Claude Haiku 5.5** agent on every screen, answering questions about pools,
points, bills, rewards and badges using only the township's real figures and the
signed-in user's own data. Never invents a rate. Always flags the EV pool's risk.
Always ends money answers with "This is not financial advice."

**Sprout degrades rather than fails.** If the model cannot be reached, a scripted
layer answers the common questions from the same database rows the model would
have read. Measured: ~1 second to first word, with prompt caching.

---

## 4. What is actually built

All of this is live and reachable. Nothing below is a mockup.

### Resident / Supporter
- Home with wallet, points, total invested, next payout, CO₂ share
- Invest: three pool cards → detail page with assets, funding progress, returns
  example, conservative case, **risk acknowledgement checkbox**, amount, confirm
- Portfolio: investments by pool, payout history, cumulative chart
- Wallet: balance, transactions, spend at mall (+10%, QR code), points conversion
- Points: balance, activities, **ask to check in**, history
- Points guide: how every point is earned
- Bills: add monthly bill, **photograph it and the app reads kWh and amount**,
  kWh trend chart, automatic energy-saving points
- Rewards: catalogue by mall, redeem to a QR code, "My codes"
- Badges: ladder with images, **celebration animation** on earning one
- Risk management page
- Feedback, with the township team's reply shown back
- Community (shared with all roles)
- Profile

### Merchant
- Accept a code (typed or scanned) — rejects reuse
- Shop energy dashboard: kWh vs baseline, RM saved, monthly chart
- Promotions: township offers must be **accepted before they reach residents**

### Township Admin
- Overview KPIs from `admin_overview()`
- Twelve-month trends
- **Check-in approval queue** — wrong codes flagged
- Run demo payouts for a month
- Manage activities (create, edit, remove — blocked once points were earned)
- Manage rewards
- Community moderation, pinned announcements
- Feedback replies, routed to the related party
- **Four CSV report exports** for ESG reporting

### Platform
- Installable PWA, mobile-first, works at 360px
- Three roles, one database
- Supabase keep-alive GitHub Action (free projects pause after 7 idle days)

---

## 5. Architecture

```
Actors ─→ Next.js PWA ─→ middleware.ts ─→ ┌─ Resident area
(3 roles)   (Vercel)     (session +      ├─ Merchant area
                          role routing)   └─ Admin area
                                               │
                     AI layer ◄────────────────┤
          (Claude Haiku 5.5: Sprout            │
           streamed + prompt-cached;           ▼
           bill OCR via vision +        Supabase Postgres
           JSON schema; scripted        · RLS on every table
           fallback when offline)       · SECURITY DEFINER functions
                                        · Triggers enforce the rules
                                        · Private storage for bills
```

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

### Security model — the strongest technical claim

**Authorisation lives in the database, not the interface.**

- The app only ever holds the Supabase **publishable key**. The `service_role`
  key is never used and never deployed.
- **RLS** decides what each row-owner can see.
- **SECURITY DEFINER functions** gate everything crossing a user boundary
  (`is_admin()`, `merchant_accept_code()`, `review_checkin()`).
- Role checks in middleware are a convenience so nobody lands on an empty page —
  **not** a security boundary.
- Pool minimums and maximums, the RM50,000 rolling limit, the risk-acknowledgement
  requirement, badge thresholds and energy-saving points are **all triggers and
  functions**. Changing the UI cannot change the rules.

> **The line to use:** "If you deleted our entire front end, the rules would still
> hold. They are in Postgres, not in JavaScript."

---

## 6. Impact

Per township developer, modelled over five years:

| | Year 1 | Year 5 |
| --- | --- | --- |
| Raised from residents | RM3.2m | RM5.0m |
| Residents' profit | RM82,163 | RM636,880 |
| Solar running | 1.5 MW | 17.5 MW |
| **CO₂ avoided a year** | **1,519 tCO₂e** | **16,845 tCO₂e** |

Reaching **20 MW in five years**, matching the **SDP × GSPARX JV target**.

**For residents** — 5–6.5% on the low-risk pools against a ~1.9% fixed deposit,
from RM100, in assets they can walk past.

**For the developer** — net gain from Year 1; cheaper capital for solar (5% to
residents instead of 8.5% own money); higher mall footfall through the +10%
bonus; tenant retention through lower shop bills; auditable carbon and engagement
data for the sustainability report.

**For shop tenants** — about **25% off the electricity bill** with no capital,
and **100% of the saving** once the three years are up.

**For the planet** — every figure above is computed from the grid emission factor
for Peninsular Malaysia (**0.74 tCO₂e/MWh**) against real asset sizes, and each
resident sees their own share of it before they invest.

---

## 7. Differentiation

| Alternative | Why it doesn't solve this |
| --- | --- |
| Fixed deposit (~1.9%) | Safe but no link to the township, no carbon, no community |
| Green SRI sukuk | Institutional minimums; a resident cannot participate |
| Equity crowdfunding | Start-up equity, not infrastructure; different risk entirely |
| Mall loyalty apps | Let you spend, never invest. One-directional |
| CREAM rooftop leasing | Requires owning a roof — excludes condo owners and renters |
| **Township Green Loop** | **From RM100, local, visible, carbon-linked, and the returns circulate back into the township** |

---

## 8. Demo accounts and walkthrough

Password `123456` for all. The sign-in page lists them and fills the form on tap.

| Account | Who | What to show |
| --- | --- | --- |
| `zara@demo.com` | Zara Abdullah, resident | The full picture: RM3,500 across all pools, every badge, payouts, bills, rewards |
| `mei@demo.com` | Mei Ling Tan, resident | Her first badge is unopened — the celebration fires on sign-in |
| `supporter@demo.com` | Nurul Hidayah, supporter | Invests from Penang; check-ins closed to her, with the reason given |
| `shop@demo.com` | Kopi Hijau Café | Accept a code, shop energy dashboard, offers to accept or decline |
| `admin@demo.com` | Township team | Approve check-ins, run a payout, propose offers, moderate, reports |

### Five-minute walkthrough (use this as the video spine)

1. **Zara** → Invest → pick a pool → read the risk statement → see the carbon
   share → confirm
2. **Points** → ask to check in to a recycling drop-off
3. **Admin** → Check-in requests → approve it. *One request has a deliberately
   wrong code, flagged red*
4. **Admin** → Run demo payout → the KPIs and trends move
5. **Zara** → Wallet → spend RM10 at KL East Mall → an RM11 credit with a QR
6. **Shop** → paste that code → "Mall credit accepted". **Try it twice; it refuses**
7. **Supporter** → Points → no check-in form, with the reason given
8. **Sprout** → "Which pool suits RM1,000 and low risk?"

Steps 3, 6 and 7 are the ones that show judgement rather than features. Step 6 in
particular — a code that works once and then doesn't — proves the rules are real.

---

## 9. Lines worth using

- "Residents fund their township's green assets, and get paid back in ringgit,
  points and cleaner air."
- "A fixed deposit pays 1.9%. The developer borrows at 8.5%. We put residents in
  the middle at 5%, and both sides win."
- "You are a funder, not a roof landlord."
- "A poster code alone awards nothing." *(on check-in approval)*
- "You cannot buy your way to Planet Hero." *(on badges)*
- "If you deleted our entire front end, the rules would still hold."
- "We show you the bad case before you invest, not after."
- "The carbon is the point."

---

## 10. Honesty — what NOT to claim

Keeping these straight is what makes the rest believable. A judge who catches one
overclaim discounts everything else.

- **Demo data only.** No real money moves. Say it.
- **Not a deposit, not covered by PIDM.** The app says this on every money screen;
  the pitch must too.
- **The EV pool can lose money.** Conservative case returns 60% of capital. Never
  present ~6.6% without "not guaranteed".
- **The five-year model is a model**, built from the business plan workbook — not
  observed results.
- **Survey answers are stated intention**, not behaviour, and sample sizes are
  small. Report the denominator ("11 of 14 testers"), never a bare percentage.
- **No regulatory approval exists.** The design assumes a licensed market operator
  holds funds; that relationship is modelled, not signed.
- **The PDF path of the bill scanner is untested** on a real bill. Photos work.

---

## 11. Suggested pitch deck structure (10 slides)

1. **Title** — name, one line, live URL, team
2. **The gap** — 1.9% vs 8.5%, shown as two bars with the space between them
   labelled. This single slide carries the whole argument
3. **Who's stuck** — residents, developer, shop tenants; one line each
4. **The loop** — the circular diagram from §3.2
5. **Three pools** — the table, with the EV risk in red
6. **We show the bad case too** — normal vs conservative side by side
7. **Beyond investing** — points, check-in approval, badges, bills, community
8. **Architecture** — the diagram from §5, with the trigger arrow highlighted
9. **Impact** — the Year 1 / Year 5 table, 16,845 tCO₂e as the hero number
10. **Live demo** — QR to the URL, demo accounts, "try it now"

Slide 6 is the one most teams won't have. Lead on it in Q&A.

## 12. Suggested video structure (2–3 minutes)

| Time | Content |
| --- | --- |
| 0:00–0:20 | The gap. 1.9% vs 8.5%. "Your savings and your township's solar panels are both underperforming, for the same reason." |
| 0:20–0:40 | The idea, in one sentence, over the landing page |
| 0:40–1:40 | **Screen recording**: invest with the risk statement and carbon share → check-in request → admin approves → payout runs → wallet → mall credit → shop accepts → shop refuses the reuse |
| 1:40–2:10 | Sprout answering a real question, fast |
| 2:10–2:30 | Impact numbers; 16,845 tCO₂e |
| 2:30–2:45 | "Demo data, built in a week, live at this URL." Close on the QR |

Record the walkthrough in one unbroken take if you can. Judges have seen enough
polished edits; a single continuous recording of a working app is more convincing
than a montage.

---

## 13. Terms

- **Resident** — lives in the township; full access
- **Supporter** — invests from elsewhere; same pools, no activity check-ins
- **Merchant** — mall shop owner; accepts codes, sees shop energy, accepts offers
- **Township admin** (`developer_admin`) — approves, moderates, reports
- **Pool** — one of the three asset classes open for funding
- **Mall credit** — wallet money converted to spend at a mall, worth 10% more
- **Check-in** — attendance at an activity, confirmed by an admin before points
- **tCO₂e** — tonnes of CO₂ equivalent avoided per year
