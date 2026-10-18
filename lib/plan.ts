/**
 * Resident-facing figures taken from Township_Green_Loop_Business_Plan_Final.xlsx,
 * sheet "Investor_View". They are proportional to the amount invested: the
 * return % is identical at the minimum and the maximum, only the ringgit
 * changes, so one multiplier per pool reproduces the sheet exactly.
 *
 * `total` = every ringgit you get back over the pool's whole payback period,
 * per RM1 invested (so it includes your capital).
 */
export type PlanCase = {
  /** Total received per RM1 invested, over the payback period. */
  total: number;
  /** Effective rate a year, where the sheet states one. */
  ratePerYear?: number;
};

export type PoolPlan = {
  paybackLabel: string;
  normal: PlanCase;
  conservative: PlanCase;
  conservativeNote: string;
  facts: string[];
};

export const POOL_PLAN: Record<string, PoolPlan> = {
  solar: {
    paybackLabel: "5 years, monthly",
    // 113.227401864066 per 100 invested
    normal: { total: 1.13227401864066, ratePerYear: 0.05 },
    conservative: { total: 1.13227401864066, ratePerYear: 0.05 },
    conservativeNote:
      "Unchanged. The JV passes part of its funding saving to back a 4.5% floor, so the stress test does not move this pool.",
    facts: [
      "You are a funder, not a roof landlord. The developer/JV owns and runs the panels.",
      "Tenants, malls and factories pay for the power, and residents' payouts are paid first.",
      "Contract rate 5% a year with a 4.5% floor, repaid monthly over 5 years.",
      "Most you can hold in this pool: RM2,000.",
      "Different from SDP's CREAM roof-leasing project in Elmina.",
    ],
  },
  upgrade: {
    paybackLabel: "3 years, monthly",
    // 110.336410355435 per 100 invested
    normal: { total: 1.10336410355435, ratePerYear: 0.065 },
    // 105.058427809761 per 100, effective 3.23% a year
    conservative: { total: 1.05058427809761, ratePerYear: 0.032304876396809 },
    conservativeNote:
      "Shop defaults rise from 2% to 10% a year. You still finish ahead, but earn roughly half.",
    facts: [
      "Efficient air-con, fridges and LED for mall shops, repaid from 80% of the bill savings.",
      "The installer contract guarantees a minimum saving of RM800 per shop a month.",
      "Most you can hold in this pool: RM1,000.",
      "Totals are already after expected shop defaults and the bad-debt reserve.",
      "If a shop closes you can lose part of your money; a reserve and the guarantee reduce this.",
    ],
  },
  ev: {
    paybackLabel: "7 years, from charging income",
    // 128.709606666667 per 100 invested
    normal: { total: 1.28709606666667, ratePerYear: 0.0661872679910144 },
    // 60 per 100 — residents get back about 60%
    conservative: { total: 0.6, ratePerYear: -0.113514765808182 },
    conservativeNote:
      "Usage halves to 30 kWh a day per charger. You get back about 60% of your money — a real loss.",
    facts: [
      "The thinnest pool. A licensed charge point operator co-invests half and runs the chargers.",
      "Payouts come only from charging profit — there is no fixed rate.",
      "The developer and platform take their 10% shares only after residents get their money back.",
      "If usage falls below 60 kWh a day, partners top up, capped at RM3,000 per charger a year.",
      "Most you can hold in this pool: RM500 — the tightest cap of the three.",
      "Price wars, cost rises and a refused government grant are NOT covered.",
    ],
  },
};

/** Most one resident may hold across all three pools at once (2,000 + 1,000 + 500). */
export const MAX_ACROSS_POOLS = 3500;

/** The retail limit the database enforces on a rolling 12 months. */
export const YEARLY_RETAIL_LIMIT = 50000;

/** The other half of the retail limit: per issuer, not per year. */
export const PER_ISSUER_LIMIT = 10000;
