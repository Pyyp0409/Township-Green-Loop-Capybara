import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MODEL = "claude-haiku-5-5";
const MAX_BYTES = 5 * 1024 * 1024;

/** What Claude will accept inline. A HEIC straight off an iPhone is not one. */
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const PROMPT = `You are reading a Malaysian household electricity bill, usually
from Tenaga Nasional Berhad (TNB).

- kwh: the units consumed for this billing month ("Jumlah Unit", "kWh",
  "Penggunaan"). Not the meter reading, and not the previous month's figure.
- amount_rm: the amount payable for this month ("Jumlah Perlu Dibayar",
  "Caj Semasa", "Amaun"). Digits only, no "RM".
- bill_month: the month the bill is FOR, as YYYY-MM. If only a bill date is
  shown, use that month.
- Use null for anything you cannot read with confidence. Never guess a number.
- Set confidence to "low" if the image is blurry, cropped or not a bill.`;

/** The model fills this in directly, so a stray sentence cannot break parsing. */
const SCHEMA = {
  type: "object",
  properties: {
    kwh: { type: ["number", "null"], description: "Units consumed this month" },
    amount_rm: { type: ["number", "null"], description: "Amount payable in RM" },
    bill_month: { type: ["string", "null"], description: "YYYY-MM" },
    confidence: { type: "string", enum: ["high", "low"] },
  },
  required: ["kwh", "amount_rm", "bill_month", "confidence"],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({
      offline: true,
      error:
        "Bill scanning is offline because no AI key is set up. Type the numbers in below instead.",
    });
  }

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const candidate = formData.get("file");
    if (candidate instanceof File) file = candidate;
  } catch {
    return Response.json({ error: "Could not read the upload." }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return Response.json({ error: "Choose a photo or PDF first." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "That file is larger than 5 MB." }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf";
  // An empty type comes from some phone browsers; a photo is the safe guess.
  const imageType = (file.type || "image/jpeg") as ImageType;
  if (!isPdf && !IMAGE_TYPES.includes(imageType)) {
    return Response.json({
      error: "That file type cannot be read. Use a JPG, PNG or PDF.",
    });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
    const client = new Anthropic();

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      // Reading figures off a bill needs no deliberation, and the person is
      // watching a spinner.
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            isPdf
              ? {
                  type: "document" as const,
                  source: { type: "base64" as const, media_type: "application/pdf" as const, data: bytes },
                }
              : {
                  type: "image" as const,
                  source: { type: "base64" as const, media_type: imageType, data: bytes },
                },
            { type: "text" as const, text: PROMPT },
          ],
        },
      ],
    });

    // Read by type: a response can carry more than one kind of block.
    const raw = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!raw) {
      return Response.json({ error: "Could not read that bill. Try a clearer photo." });
    }

    let parsed: {
      kwh?: number | null;
      amount_rm?: number | null;
      bill_month?: string | null;
      confidence?: string;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json({ error: "Could not read that bill. Try a clearer photo." });
    }

    // Everything is a suggestion — the resident confirms before it is saved.
    return Response.json({
      kwh: typeof parsed.kwh === "number" ? parsed.kwh : null,
      amount_rm: typeof parsed.amount_rm === "number" ? parsed.amount_rm : null,
      bill_month: /^\d{4}-\d{2}$/.test(String(parsed.bill_month))
        ? parsed.bill_month
        : null,
      confidence: parsed.confidence === "high" ? "high" : "low",
    });
  } catch (error) {
    console.error("scan-bill error", error);
    return Response.json({
      error: "The scanner could not be reached. Type the numbers in instead.",
    });
  }
}
