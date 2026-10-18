import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MODEL = "gemini-flash-latest";
const MAX_BYTES = 5 * 1024 * 1024;

const PROMPT = `You are reading a Malaysian household electricity bill, usually
from Tenaga Nasional Berhad (TNB).

Return ONLY a JSON object, no prose and no code fence, shaped exactly like:
{"kwh": number|null, "amount_rm": number|null, "bill_month": "YYYY-MM"|null, "confidence": "high"|"low"}

- kwh: the units consumed for this billing month ("Jumlah Unit", "kWh", "Penggunaan").
  Not the meter reading, and not the previous month's figure.
- amount_rm: the amount payable for this month ("Jumlah Perlu Dibayar",
  "Caj Semasa", "Amaun"). Digits only, no "RM".
- bill_month: the month the bill is FOR, as YYYY-MM. If only a bill date is
  shown, use that month.
- Use null for anything you cannot read with confidence. Never guess a number.
- Set confidence to "low" if the image is blurry, cropped or not a bill.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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

  try {
    const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: file.type || "image/jpeg", data: bytes } },
            { text: PROMPT },
          ],
        },
      ],
      config: { temperature: 0, responseMimeType: "application/json" },
    });

    const raw = response.text?.trim();
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
