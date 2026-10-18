import { GoogleGenAI } from "@google/genai";
import { unstable_cache } from "next/cache";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { rm } from "@/lib/format";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "gemini-flash-latest";

const SYSTEM_PROMPT = `You are Sprout, the helper inside the Township Green Loop
app, used by people funding a Malaysian township's green assets. You help with
the WHOLE app: the three investment pools, points and check-ins, electricity
bills, the wallet and mall credits, rewards, badges and the community space.

How to answer:
- Simple, everyday English. Short sentences. No jargon. Warm and encouraging.
- Be brief. Three or four short sentences unless asked for detail.
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
 * once and reused. This is what made every message wait on ten round trips.
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

    return `THE THREE POOLS (the only rates you may quote):
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
  const holdings =
    byPool.size > 0
      ? [...byPool.entries()].map(([pool, total]) => `- ${pool}: ${rm(total)}`).join("\n")
      : "- none yet";

  const myBadges =
    Array.isArray(badges) && badges.length > 0
      ? (badges as { name: string }[]).map((b) => b.name).join(", ")
      : "none yet";

  const who =
    profile?.membership === "supporter"
      ? `A supporter who funds this township from ${profile?.home_city ?? "elsewhere"}. ` +
        "They invest and earn the same returns, but activity check-ins are only for " +
        "people who take part in person, so they cannot ask to check in. They can " +
        "still earn points by converting wallet money. Never tell them to check in."
      : `A resident who lives in ${profile?.township ?? "the township"} and can do everything.`;

  return `THIS MEMBER:
${who}

THEIR OWN DATA:
Wallet balance: ${rm(Number(wallet ?? 0))}
Points balance: ${Number(points ?? 0)}
Badges earned: ${myBadges}
Active investments:
${holdings}`;
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      "I am offline right now because no AI key is set up. You can still find " +
        "everything yourself: pool rates and risks on Invest, how to earn points " +
        "on Points, and your own numbers on Home.",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  try {
    const catalogue = await getCatalogue();
    const ai = new GoogleGenAI({ apiKey });
    const history = (body.history ?? []).slice(-6).map((turn) => ({
      role: turn.role === "model" ? "model" : "user",
      parts: [{ text: String(turn.text).slice(0, 1500) }],
    }));

    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents: [...history, { role: "user", parts: [{ text: message.slice(0, 1500) }] }],
      config: {
        systemInstruction: `${SYSTEM_PROMPT}\n\nCONTEXT:\n${catalogue}\n\n${personal}`,
        temperature: 0.4,
        maxOutputTokens: 600,
      },
    });

    // Stream the text back so the first words appear in about a second
    // instead of the whole answer landing at once.
    const encoder = new TextEncoder();
    const body$ = new ReadableStream<Uint8Array>({
      async start(controller) {
        let sent = false;
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              sent = true;
              controller.enqueue(encoder.encode(text));
            }
          }
          if (!sent) {
            controller.enqueue(
              encoder.encode(
                "Sorry, I could not answer that one. Try asking it a different way.",
              ),
            );
          }
        } catch (error) {
          console.error("agent stream error", error);
          controller.enqueue(
            encoder.encode(
              sent
                ? "\n\n(Sorry — I lost my train of thought there.)"
                : "I could not be reached just now. Please try again in a moment.",
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body$, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        // Stops proxies holding the whole body before sending it on.
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("agent error", error);
    return new Response(
      "I could not be reached just now. Please try again in a moment.",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
}
