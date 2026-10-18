import { num, rm } from "@/lib/format";

/**
 * Sprout's safety net.
 *
 * The model answers every question normally. But a demo runs in front of
 * people who will not wait, and an API can have a bad minute at exactly the
 * wrong moment. So when the model cannot be reached, these rules answer the
 * common questions from the same database figures the model would have used.
 * Nothing here invents a rate or a balance — every number is passed in.
 */

export type PoolFact = {
  id: string;
  name: string;
  risk: string | null;
  rate: number;
  payback_years: number | null;
  min_invest: number;
  max_invest: number;
};

export type SproutFacts = {
  pools: PoolFact[];
  rules: { title: string; detail: string | null; points: number }[];
  badges: { name: string; min_points: number }[];
  activities: { title: string; points: number; location: string | null }[];
  wallet: number;
  points: number;
  myBadges: string[];
  holdings: { pool: string; total: number }[];
  isSupporter: boolean;
};

const NOT_ADVICE = "\n\nThis is not financial advice.";

/** "What's my balance?" and "whats my balance" must match the same rule. */
function normalise(question: string) {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

function poolLine(p: PoolFact) {
  const rate = `${(p.rate * 100).toFixed(2)}%`;
  // The brief says the EV pool must carry its warning every time it appears.
  const warning = p.id === "ev" ? " High risk — capital not guaranteed." : "";
  return (
    `• ${p.name}: ${rate} a year, paid back over ${p.payback_years} years, ` +
    `${rm(p.min_invest)} to ${rm(p.max_invest)} per member.${warning}`
  );
}

/** Which pool the question names, if any. */
function namedPool(q: string): string | null {
  if (has(q, "solar", "panel", "roof")) return "solar";
  if (has(q, "upgrade", "shop energy", "aircon", "chiller")) return "upgrade";
  if (has(q, " ev", "ev ", "charger", "charging", "vehicle")) return "ev";
  return null;
}

type Rule = {
  test: (q: string) => boolean;
  answer: (f: SproutFacts, q: string) => string;
};

const RULES: Rule[] = [
  {
    // Wallet first: "how much do I have" is far more often money than points.
    test: (q) => has(q, "wallet", "balance", "how much money", "cash"),
    answer: (f) =>
      `Your wallet holds ${rm(f.wallet)}. You can spend it at a mall, where it ` +
      `becomes a credit worth 10% more, or turn it into points at 20 points ` +
      `per RM1. Open Wallet to do either.`,
  },
  {
    test: (q) =>
      has(q, "point") && has(q, "my", "i have", "how many", "balance", "got"),
    answer: (f) =>
      `You have ${num(f.points)} points.` +
      (f.myBadges.length > 0 ? ` Badges earned: ${f.myBadges.join(", ")}.` : "") +
      ` Open Points to see where they came from.`,
  },
  {
    test: (q) => has(q, "point") && has(q, "earn", "get more", "how do i get", "collect"),
    answer: (f) => {
      const lines = f.rules.map((r) => `• ${r.title} — ${r.points} points`).join("\n");
      const checkIn = f.isSupporter
        ? `Check-ins are for people taking part in person, so they are not open ` +
          `to supporters. You can still earn points by converting wallet money ` +
          `at 20 points per RM1.`
        : `Check-ins are not automatic: ask to check in on the Points screen and ` +
          `a township admin confirms you were really there.`;
      return `Here is how points are earned:\n${lines}\n\n${checkIn}`;
    },
  },
  {
    test: (q) => has(q, "rate", "return", "interest", "profit", "how much do i get"),
    answer: (f) =>
      `The three pools pay:\n${f.pools.map(poolLine).join("\n")}` + NOT_ADVICE,
  },
  {
    test: (q) => namedPool(q) !== null,
    answer: (f, q) => {
      const pool = f.pools.find((p) => p.id === namedPool(q));
      if (!pool) {
        return `Here are the pools as they stand:\n${f.pools.map(poolLine).join("\n")}` + NOT_ADVICE;
      }
      return (
        `${poolLine(pool)}\n\nOpen Invest and choose ${pool.name} for its full ` +
        `risk statement before you put anything in.` + NOT_ADVICE
      );
    },
  },
  {
    test: (q) => has(q, "how do i invest", "how to invest", "start investing", "put money"),
    answer: (f) =>
      `Open Invest, pick a pool, and read its risk statement. Tick the box to ` +
      `say you understand it, enter an amount inside the pool's limits, then ` +
      `confirm. The pools today:\n${f.pools.map(poolLine).join("\n")}` + NOT_ADVICE,
  },
  {
    test: (q) => has(q, "limit", "maximum", "max ", "how much can i", "cap"),
    answer: (f) =>
      `Each pool has its own limit per member:\n${f.pools
        .map((p) => `• ${p.name}: up to ${rm(p.max_invest)}`)
        .join("\n")}\n\nAcross all pools together, at most ${rm(50000)} in any ` +
      `rolling 12 months.` + NOT_ADVICE,
  },
  {
    test: (q) => has(q, "risk", "safe", "guarantee", "lose", "pidm", "protected"),
    answer: (f) =>
      `Nothing here is a deposit and none of it is covered by PIDM. Your money ` +
      `is held in trust by a licensed market operator, never by the app. The ` +
      `EV pool is the highest risk — its payouts come only from charging profit, ` +
      `and capital is not guaranteed. Each pool page carries its full risk ` +
      `statement.` + NOT_ADVICE,
  },
  {
    test: (q) => has(q, "badge", "level", "rank"),
    answer: (f) =>
      `Badges come from lifetime points earned, and spending points never takes ` +
      `one away:\n${f.badges
        .map((b) => `• ${b.name} at ${num(b.min_points)} points`)
        .join("\n")}\n\nYou are on ${num(f.points)} points` +
      (f.myBadges.length > 0 ? `, with ${f.myBadges.join(", ")} earned.` : "."),
  },
  {
    test: (q) => has(q, "check in", "checkin", "check-in", "scan", "qr"),
    answer: (f) =>
      f.isSupporter
        ? `Check-ins are only for people who take part in person, so they are ` +
          `not open to supporters. You can still earn points by converting ` +
          `wallet money at 20 points per RM1.`
        : `Open Points and choose "Ask to check in" for the activity you joined. ` +
          `A township admin confirms you were really there before the points are ` +
          `added — that is what stops a poster code being passed around.`,
  },
  {
    test: (q) => has(q, "activity", "activities", "event", "whats on", "what is on"),
    answer: (f) =>
      f.activities.length > 0
        ? `On now:\n${f.activities
            .map((a) => `• ${a.title} — ${a.points} points${a.location ? `, at ${a.location}` : ""}`)
            .join("\n")}\n\nOpen Points to ask to check in.`
        : `There is nothing listed right now. Open Points to see new activities as they appear.`,
  },
  {
    test: (q) => has(q, "reward", "redeem", "voucher", "spend my point"),
    answer: () =>
      `Open Rewards, choose a mall, and pick something within your points ` +
      `balance. You get a code to show at the shop. Your codes stay under ` +
      `"My codes" on the same screen.`,
  },
  {
    test: (q) => has(q, "bill", "electric", "kwh", "tnb", "tenaga"),
    answer: () =>
      `Open Bills and add your monthly bill — you can photograph it and the app ` +
      `reads the kWh and the amount for you. If you used at least 10% less than ` +
      `the month before, energy-saving points are added automatically.`,
  },
  {
    test: (q) => has(q, "my investment", "portfolio", "what did i invest", "payout"),
    answer: (f) =>
      f.holdings.length > 0
        ? `You hold:\n${f.holdings
            .map((h) => {
              // Holdings arrive keyed by pool id; people know the pool's name.
              const name = f.pools.find((p) => p.id === h.pool)?.name ?? h.pool;
              return `• ${name}: ${rm(h.total)}`;
            })
            .join("\n")}\n\nOpen Portfolio for your payout history.` + NOT_ADVICE
        : `You have not invested yet. Open Invest to see the three pools.` + NOT_ADVICE,
  },
  {
    test: (q) => has(q, "community", "post", "neighbour", "neighbor"),
    answer: () =>
      `Community is one shared space for residents, mall shops and the township ` +
      `admin. Open Community to read it or post. You can post anonymously if ` +
      `you would rather not use your name.`,
  },
];

/** Returns null when no rule is a confident match. */
export function scriptedAnswer(question: string, facts: SproutFacts): string | null {
  const q = normalise(question);
  for (const rule of RULES) {
    if (rule.test(q)) return rule.answer(facts, q);
  }
  return null;
}

/** Always returns something useful — used when the model cannot be reached. */
export function fallbackAnswer(question: string, facts: SproutFacts): string {
  const matched = scriptedAnswer(question, facts);
  if (matched) return matched;

  return (
    `I could not reach my own thinking just now, so here is the short version ` +
    `from your township's own figures.\n\n` +
    `${facts.pools.map(poolLine).join("\n")}\n\n` +
    `Your wallet holds ${rm(facts.wallet)} and you have ${facts.points} points. ` +
    `Invest has the full risk statements, Points has how to earn more, and ` +
    `Bills is where a photo of your bill becomes energy-saving points. ` +
    `Ask me again in a moment and I should be back.` + NOT_ADVICE
  );
}
