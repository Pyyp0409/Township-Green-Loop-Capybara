import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { rm } from "@/lib/format";

export const runtime = "nodejs";

const MODEL = "gemini-flash-latest";

const SYSTEM_PROMPT = `You are the Green Advisor inside the Township Green Loop app,
used by residents of a Malaysian township.

Rules you must follow:
- Answer in simple, everyday English. Short sentences. No jargon.
- Use ONLY the pool rates, limits and figures given in the context below. Never
  invent a rate, a return, or a number. If something is not in the context, say
  you do not have that information.
- Amounts are Malaysian ringgit, written like RM1,234.56.
- The EV pool is high risk and capital is not guaranteed. Say so whenever you
  mention it.
- You may explain and compare the pools, and help the person think about what
  fits their situation. Do not tell them what they must do.
- Finish every answer with this exact sentence on its own line:
  This is not financial advice.`;

/** Everything the model is allowed to know — this user's own data only. */
async function buildContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: pools },
    { data: investments },
    { data: bills },
    { data: wallet },
    { data: points },
  ] = await Promise.all([
    supabase.from("pools").select("*").order("rate"),
    supabase
      .from("investments")
      .select("pool_id, amount, status, created_at")
      .eq("status", "active"),
    supabase
      .from("energy_bills")
      .select("bill_month, kwh, amount_rm")
      .order("bill_month", { ascending: false })
      .limit(6),
    supabase.rpc("my_wallet"),
    supabase.rpc("my_points"),
  ]);

  const poolLines = (pools ?? [])
    .map(
      (p) =>
        `- ${p.name} (id: ${p.id}): ${(Number(p.rate) * 100).toFixed(2)}% a year, ` +
        `${p.rate_type}. Risk: ${p.risk}. Payback ${p.payback_years} years. ` +
        `Between ${rm(p.min_invest)} and ${rm(p.max_invest)} per resident. ` +
        `${p.description ?? ""} Risk statement: ${p.risk_text ?? "n/a"}`,
    )
    .join("\n");

  const investedByPool = new Map<string, number>();
  for (const inv of investments ?? []) {
    investedByPool.set(
      inv.pool_id,
      (investedByPool.get(inv.pool_id) ?? 0) + Number(inv.amount),
    );
  }
  const holdings =
    investedByPool.size > 0
      ? [...investedByPool.entries()]
          .map(([pool, total]) => `- ${pool}: ${rm(total)}`)
          .join("\n")
      : "- none yet";

  const billLines =
    (bills ?? []).length > 0
      ? (bills ?? [])
          .map((b) => `- ${b.bill_month}: ${b.kwh} kWh, ${rm(b.amount_rm)}`)
          .join("\n")
      : "- no bills uploaded yet";

  return `THE THREE POOLS (the only rates you may quote):
${poolLines}

LIMITS: a resident may invest at most RM50,000 across all pools in any 12 months,
and each pool has its own minimum and maximum shown above.

THIS RESIDENT'S OWN DATA:
Wallet balance: ${rm(Number(wallet ?? 0))}
Points: ${Number(points ?? 0)}
Active investments:
${holdings}
Recent electricity bills (newest first):
${billLines}

Residents earn points by recycling, joining events, and cutting their own
electricity by at least 10% versus the month before. Points buy rewards at the
malls. Wallet money spent at a mall becomes a credit worth 10% more.`;
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

  const context = await buildContext();
  if (!context) {
    return Response.json({ error: "Please sign in again." }, { status: 401 });
  }

  // The app must still work without a key.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({
      reply:
        "The advisor is offline right now because no AI key is set up. You can " +
        "still see every pool's rate, risk and limits on the Invest screen, and " +
        "your own numbers on Home and Portfolio.\n\nThis is not financial advice.",
      offline: true,
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const history = (body.history ?? []).slice(-6).map((turn) => ({
      role: turn.role === "model" ? "model" : "user",
      parts: [{ text: String(turn.text).slice(0, 2000) }],
    }));

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        ...history,
        { role: "user", parts: [{ text: message.slice(0, 2000) }] },
      ],
      config: {
        systemInstruction: `${SYSTEM_PROMPT}\n\nCONTEXT:\n${context}`,
        temperature: 0.4,
        maxOutputTokens: 800,
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      return Response.json({
        reply:
          "Sorry, I could not answer that one. Try asking it a different way.\n\nThis is not financial advice.",
      });
    }

    return Response.json({ reply });
  } catch (error) {
    console.error("advisor error", error);
    return Response.json({
      reply:
        "The advisor could not be reached just now. Please try again in a moment.\n\nThis is not financial advice.",
      offline: true,
    });
  }
}
