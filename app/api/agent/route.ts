import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { rm } from "@/lib/format";
import { fallbackAnswer, type SproutFacts, type PoolFact } from "@/lib/sprout-script";

export const runtime = "nodejs";
// Vercel's Hobby plan allows up to 60s; we stop ourselves well before that.
export const maxDuration = 60;

const MODEL = "claude-haiku-5-5";

/** Stop waiting on the model after this, so the person gets words not a 504. */
const ANSWER_TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT = `You are Sprout, the helper inside the Township Green Loop
app, used by people funding a Malaysian township's green assets. You help with
the WHOLE app: the three investment pools, points and check-ins, electricity
bills, the wallet and mall credits, rewards, badges and the community space.

How to answer:
- Simple, everyday English. Short sentences. No jargon. Warm and encouraging.
- Be brief. Three or four short sentences unless asked for detail.
- Plain text only. The chat window shows your words exactly as you write them
  and does not understand markdown, so never use *, **, # or backticks. To list
  things, put each on its own line starting with "• ".
- Use ONLY the figures in the context below. Never invent a rate, a return, a
  points value or a balance. If it is not in the context, say you do not have it.
- Money is Malaysian ringgit, written like RM1,234.56.
- The EV pool is high risk and capital is not guaranteed. Say so whenever you
  mention it.
- If someone asks how to do something, give the steps and name the screen, for
  example "open Points, then Ask to check in".
- You may explain, compare and encourage. Never tell someone what they must do
  with their money.
- When the answer involves money or investing, finish with this exact sentence
  on its own line:
  This is not financial advice.`;

/**
 * The catalogue is the same for everybody and changes rarely, so it is built
 * once and reused. It is also the cached half of the prompt, so it must stay
 * byte-identical between requests — nothing dated or random belongs in here.
 */
const getCatalogue = unstable_cache(
  async () => {
    // A cached function may not read cookies, so this uses a plain anon client.
    // Everything below is public catalogue data that anon can already select.
    const { url, key } = supabaseEnv();
    const supabase = createPublicClient(url, key);
    const [{ data: pools }, { data: allBadges }, { data: rules }, { data: activities }] =
      await Promise.all([
        supabase.from("pools").select("*").order("rate"),
        supabase.from("badges").select("name, min_points, description").order("min_points"),
        supabase.from("point_rules").select("title, detail, points").eq("active", true),
        // never checkin_code
        supabase.from("activities").select("title, points, location").order("id"),
      ]);

    const poolFacts: PoolFact[] = (pools ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      risk: p.risk,
      rate: Number(p.rate),
      payback_years: p.payback_years,
      min_invest: Number(p.min_invest),
      max_invest: Number(p.max_invest),
    }));

    const poolLines = (pools ?? [])
      .map(
        (p) =>
          `- ${p.name} (${p.id}): ${(Number(p.rate) * 100).toFixed(2)}% a year, ` +
          `${p.rate_type}. Risk: ${p.risk}. Payback ${p.payback_years} years. ` +
          `Between ${rm(p.min_invest)} and ${rm(p.max_invest)} per resident. ` +
          `${p.description ?? ""} Risk statement: ${p.risk_text ?? "n/a"}`,
      )
      .join("\n");

    const ladder = (allBadges ?? [])
      .map((b) => `- ${b.name} at ${b.min_points} lifetime points: ${b.description}`)
      .join("\n");

    const earning = (rules ?? [])
      .map((r) => `- ${r.title} (${r.points}): ${r.detail}`)
      .join("\n");

    const whatsOn = (activities ?? [])
      .map((a) => `- ${a.title}: ${a.points} points${a.location ? `, at ${a.location}` : ""}`)
      .join("\n");

    const text = `THE THREE POOLS (the only rates you may quote):
${poolLines}

LIMITS: each pool has its own maximum per resident above, and at most
RM50,000 across all pools in any rolling 12 months.

HOW POINTS WORK:
${earning}

Check-ins are NOT automatic. The resident asks to check in on the Points screen,
and a township admin confirms they were really there before points are added.
This stops someone sharing a poster code.

ACTIVITIES ON NOW:
${whatsOn}

BADGE LADDER (lifetime points earned, never reduced by spending):
${ladder}

OTHER THINGS YOU CAN EXPLAIN:
- Wallet money spent at a mall becomes a credit worth 10% more, funded by the shops.
- Wallet money can be turned into points at 20 points per RM1. Points can never
  be turned back into money.
- Bills: upload a photo and the app reads the kWh and amount. Using at least 10%
  less than the month before earns points automatically.
- Community: one shared space for residents, mall shops and the township admin.
- Money is held in trust by a licensed market operator, never by the app itself.`;

    return {
      text,
      pools: poolFacts,
      rules: (rules ?? []).map((r) => ({
        title: r.title,
        detail: r.detail,
        points: Number(r.points),
      })),
      badges: (allBadges ?? []).map((b) => ({
        name: b.name,
        min_points: Number(b.min_points),
      })),
      activities: (activities ?? []).map((a) => ({
        title: a.title,
        points: Number(a.points),
        location: a.location,
      })),
    };
  },
  ["agent-catalogue"],
  { revalidate: 300, tags: ["agent-catalogue"] },
);

/** Only this user's own rows — four small queries, not ten. */
async function getPersonal() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: investments }, { data: wallet }, { data: points }, { data: badges }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("membership, township, home_city, full_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("investments")
        .select("pool_id, amount")
        .eq("status", "active"),
      supabase.rpc("my_wallet"),
      supabase.rpc("my_points"),
      supabase.rpc("my_badges"),
    ]);

  const byPool = new Map<string, number>();
  for (const inv of investments ?? []) {
    byPool.set(inv.pool_id, (byPool.get(inv.pool_id) ?? 0) + Number(inv.amount));
  }
  const holdings = [...byPool.entries()].map(([pool, total]) => ({ pool, total }));

  const myBadges =
    Array.isArray(badges) && badges.length > 0
      ? (badges as { name: string }[]).map((b) => b.name)
      : [];

  const isSupporter = profile?.membership === "supporter";

  const who = isSupporter
    ? `A supporter who funds this township from ${profile?.home_city ?? "elsewhere"}. ` +
      "They invest and earn the same returns, but activity check-ins are only for " +
      "people who take part in person, so they cannot ask to check in. They can " +
      "still earn points by converting wallet money. Never tell them to check in."
    : `A resident who lives in ${profile?.township ?? "the township"} and can do everything.`;

  const text = `THIS MEMBER:
${who}

THEIR OWN DATA:
Wallet balance: ${rm(Number(wallet ?? 0))}
Points balance: ${Number(points ?? 0)}
Badges earned: ${myBadges.length > 0 ? myBadges.join(", ") : "none yet"}
Active investments:
${holdings.length > 0 ? holdings.map((h) => `- ${h.pool}: ${rm(h.total)}`).join("\n") : "- none yet"}`;

  return {
    text,
    wallet: Number(wallet ?? 0),
    points: Number(points ?? 0),
    myBadges,
    holdings,
    isSupporter,
  };
}

export async function POST(request: Request) {
  let body: { message?: string; history?: { role: string; text: string }[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (!message) {
    return Response.json({ error: "Ask a question first." }, { status: 400 });
  }

  const personal = await getPersonal();
  if (!personal) {
    return Response.json({ error: "Please sign in again." }, { status: 401 });
  }

  const plainText = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    // Stops proxies holding the whole body before sending it on.
    "X-Accel-Buffering": "no",
  };

  /** The figures the safety net answers from, so it never invents one either. */
  const factsFrom = (catalogue: Awaited<ReturnType<typeof getCatalogue>>): SproutFacts => ({
    pools: catalogue.pools,
    rules: catalogue.rules,
    badges: catalogue.badges,
    activities: catalogue.activities,
    wallet: personal.wallet,
    points: personal.points,
    myBadges: personal.myBadges,
    holdings: personal.holdings,
    isSupporter: personal.isSupporter,
  });

  // No key configured: the app must still answer, so fall straight through to
  // the scripted layer rather than apologising.
  if (!process.env.ANTHROPIC_API_KEY) {
    const catalogue = await getCatalogue();
    return new Response(fallbackAnswer(message, factsFrom(catalogue)), { headers: plainText });
  }

  // The client speaks Gemini's dialect ("model"); the API wants "assistant".
  const history = (body.history ?? []).slice(-6).map((turn) => ({
    role: turn.role === "model" ? ("assistant" as const) : ("user" as const),
    content: String(turn.text).slice(0, 1500),
  }));

  const encoder = new TextEncoder();

  // Everything slow happens inside the stream. Returning the Response first
  // means the browser has the connection straight away, so a slow reply can no
  // longer turn into a gateway timeout.
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sent = false;
      const say = (text: string) => {
        sent = true;
        controller.enqueue(encoder.encode(text));
      };

      // Give up before the platform does, so the person gets a sentence
      // rather than a 504.
      const abort = new AbortController();
      const giveUp = setTimeout(() => abort.abort(), ANSWER_TIMEOUT_MS);
      let catalogue: Awaited<ReturnType<typeof getCatalogue>> | null = null;

      try {
        catalogue = await getCatalogue();
        const client = new Anthropic();

        const stream = client.messages.stream(
          {
            model: MODEL,
            max_tokens: 700,
            // Sprout answers from the context it is handed. Thinking would only
            // add seconds before the first word, and a quick reply is the whole
            // point of the bubble.
            thinking: { type: "disabled" },
            system: [
              {
                type: "text",
                text: `${SYSTEM_PROMPT}\n\nCONTEXT:\n${catalogue.text}`,
                // Identical for every member, so it is cached once and read
                // back cheaply on every later question.
                cache_control: { type: "ephemeral" },
              },
              // This member's own figures sit after the breakpoint, so one
              // person's balances never land in another person's cache.
              { type: "text", text: personal.text },
            ],
            messages: [...history, { role: "user", content: message.slice(0, 1500) }],
          },
          { signal: abort.signal },
        );

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            say(event.delta.text);
          }
        }

        if (!sent) {
          say(fallbackAnswer(message, factsFrom(catalogue)));
        }
      } catch (error) {
        const timedOut = abort.signal.aborted;
        console.error("agent stream error", timedOut ? "timed out" : error);

        if (sent) {
          say("\n\n(Sorry — I lost my train of thought there.)");
        } else if (catalogue) {
          // The model is unreachable, but the township's own numbers are not.
          say(fallbackAnswer(message, factsFrom(catalogue)));
        } else {
          say("I could not be reached just now. Please try again in a moment.");
        }
      } finally {
        clearTimeout(giveUp);
        controller.close();
      }
    },
  });

  return new Response(body$, { headers: plainText });
}
