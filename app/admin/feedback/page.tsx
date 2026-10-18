import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Section, Stat } from "@/components/ui";
import { RatingChart, type RatingPoint } from "@/components/charts/rating-chart";
import { RoleShell } from "@/app/role-shell";
import { dayLabel, num } from "@/lib/format";
import { AREAS } from "@/app/app/feedback/areas";
import { ReplyForm } from "./reply-form";

export const metadata = { title: "Feedback · Admin" };

type Summary = {
  area: string;
  responses: number;
  avg_rating: number;
  last_at: string;
};

export default async function AdminFeedbackPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fadmin%2Ffeedback");

  const supabase = await createClient();
  const [{ data: summary }, { data: rows }] = await Promise.all([
    supabase.rpc("admin_feedback_summary"),
    supabase
      .from("feedback")
      .select("id, user_id, area, rating, comment, status, admin_note, routed_to, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const label = new Map(AREAS.map((a) => [a.value as string, a.label]));
  const stats = (summary as Summary[] | null) ?? [];

  const chartData: RatingPoint[] = stats.map((s) => ({
    area: label.get(s.area) ?? s.area,
    rating: Number(s.avg_rating),
    responses: Number(s.responses),
  }));

  const total = stats.reduce((sum, s) => sum + Number(s.responses), 0);
  const overall =
    total > 0
      ? stats.reduce((sum, s) => sum + Number(s.avg_rating) * Number(s.responses), 0) /
        total
      : 0;
  const weakest = stats[0];

  return (
    <RoleShell profile={profile} area="Developer admin">
      <Link
        href="/admin"
        className="mt-5 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Overview
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">Resident feedback</h1>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Responses" value={num(total)} />
        <Stat
          label="Average rating"
          value={total > 0 ? `${overall.toFixed(2)} / 5` : "—"}
          hint={weakest ? `Weakest: ${label.get(weakest.area) ?? weakest.area}` : undefined}
        />
      </div>

      <Section title="How each part is rated">
        {chartData.length > 0 ? (
          <Card>
            <RatingChart data={chartData} />
            <p className="mt-2 text-xs text-slate-500">
              Lowest first. Red is under 3 out of 5 — that is where to look next.
            </p>
          </Card>
        ) : (
          <Empty>No feedback yet.</Empty>
        )}
      </Section>

      <Section title="What residents said">
        {(rows ?? []).length > 0 ? (
          <div className="space-y-3">
            {(rows ?? []).map((row) => (
              <Card key={row.id}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900">
                    {label.get(row.area) ?? row.area}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <Star
                        key={v}
                        className={`h-3.5 w-3.5 ${
                          v <= row.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-200"
                        }`}
                        aria-hidden
                      />
                    ))}
                  </span>
                </div>
                {row.comment ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    &ldquo;{row.comment}&rdquo;
                  </p>
                ) : null}
                <p className="mt-1.5 text-xs text-slate-400">
                  {dayLabel(row.created_at)} ·{" "}
                  {row.status === "new" ? "not answered" : row.status}
                </p>
                <ReplyForm
                  feedbackId={row.id}
                  existingNote={(row.admin_note as string | null) ?? null}
                  routedTo={(row.routed_to as string | null) ?? null}
                />
              </Card>
            ))}
          </div>
        ) : (
          <Empty>Nothing yet. Residents send feedback from More → Give feedback.</Empty>
        )}
      </Section>
    </RoleShell>
  );
}
