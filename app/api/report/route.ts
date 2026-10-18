import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Each report maps to a security-definer function that checks is_admin(). */
const REPORTS: Record<string, { fn: string; file: string }> = {
  investments: { fn: "report_investments", file: "investments" },
  points: { fn: "report_points", file: "points" },
  impact: { fn: "report_impact", file: "impact" },
  feedback: { fn: "report_feedback", file: "feedback" },
};

/** Quote anything containing a comma, quote or newline, per RFC 4180. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  // CRLF so Excel on Windows opens it cleanly.
  return lines.join("\r\n");
}

/** Errors come back as readable text, so a failed download is not a mystery. */
function plainError(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = String(searchParams.get("name") ?? "");
  const report = REPORTS[name];

  if (!report) {
    return plainError("Unknown report.", 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return plainError("Please sign in as an admin first.", 401);

  const { data, error } = await supabase.rpc(report.fn);
  if (error) {
    // A missing function means the migration has not run yet; say so plainly
    // rather than downloading an unreadable error file.
    const missing = /not find the function|does not exist/i.test(error.message);
    return plainError(
      missing
        ? `This report needs supabase/setup_v4.sql to be run first. (${error.message})`
        : error.message,
      missing ? 501 : 403,
    );
  }

  const rows = (data as Record<string, unknown>[] | null) ?? [];
  const csv = toCsv(rows);
  const today = new Date().toISOString().slice(0, 10);

  return new Response(
    // A BOM so Excel reads the UTF-8 names and the ringgit sign correctly.
    "\uFEFF" + csv,
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="green-loop-${report.file}-${today}.csv"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
