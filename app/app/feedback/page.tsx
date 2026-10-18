import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Empty, Section } from "@/components/ui";
import { dayLabel } from "@/lib/format";
import { AREAS } from "./areas";
import { FeedbackForm } from "./feedback-form";

export const metadata = { title: "Feedback" };

export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: mine } = await supabase
    .from("feedback")
    .select("id, area, rating, comment, status, admin_note, routed_to, created_at")
    .order("created_at", { ascending: false });

  const areaLabel = new Map(AREAS.map((a) => [a.value as string, a.label]));

  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Give feedback</h1>
      <p className="mt-1 text-sm text-slate-600">
        Tell the township team which part of the app to work on next.
      </p>

      <Section title="New feedback">
        <FeedbackForm />
      </Section>

      <Section title="What you have sent">
        {(mine ?? []).length > 0 ? (
          <div className="space-y-3">
            {(mine ?? []).map((row) => (
              <Card key={row.id}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900">
                    {areaLabel.get(row.area) ?? row.area}
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
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {row.comment}
                  </p>
                ) : null}
                <p className="mt-1.5 text-xs text-slate-400">
                  {dayLabel(row.created_at)} ·{" "}
                  {row.status === "new" ? "Waiting to be read" : row.status}
                </p>

                {row.admin_note ? (
                  <div className="mt-2.5 rounded-xl bg-brand-50 p-3">
                    <p className="text-xs font-medium text-brand-800">
                      Reply from the township team
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-brand-900">
                      {row.admin_note}
                    </p>
                    {row.routed_to && row.routed_to !== "none" ? (
                      <p className="mt-1 text-xs text-brand-700">
                        Passed on to the {row.routed_to}.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <Empty>Nothing sent yet. Your first piece of feedback goes here.</Empty>
        )}
      </Section>
    </main>
  );
}
