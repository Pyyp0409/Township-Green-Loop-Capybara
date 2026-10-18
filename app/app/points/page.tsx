import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Empty, Section, Stat } from "@/components/ui";
import { dayLabel, num } from "@/lib/format";
import { CheckInForm } from "./check-in-form";

export const metadata = { title: "Points" };

export default async function PointsPage() {
  const supabase = await createClient();

  // Never select checkin_code here — it belongs on the printed poster only.
  const [{ data: points }, { data: activities }, { data: history }] =
    await Promise.all([
      supabase.rpc("my_points"),
      supabase
        .from("activities")
        .select("id, title, kind, points, location, starts_at")
        .order("starts_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("point_transactions")
        .select("id, points, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  // Energy-saving points are awarded by a trigger on bill upload, not check-in.
  const checkInable = (activities ?? []).filter((a) => a.kind !== "energy_saving");

  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Points</h1>

      <div className="mt-5">
        <Stat
          label="Your balance"
          value={num(points ?? 0)}
          hint="Spend them on rewards at any participating mall"
        />
      </div>

      <Section title="Check in">
        <CheckInForm
          activities={checkInable as { id: number; title: string; points: number }[]}
        />
      </Section>

      <Section title="Activities">
        <div className="space-y-3">
          {(activities ?? []).map((activity) => (
            <Card key={activity.id}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-slate-900">
                  {activity.title}
                </span>
                <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  +{activity.points}
                </span>
              </div>
              {activity.location ? (
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {activity.location}
                </p>
              ) : null}
              {activity.starts_at ? (
                <p className="mt-1 text-xs text-slate-400">
                  {dayLabel(activity.starts_at)}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      </Section>

      <Section title="History">
        {(history ?? []).length > 0 ? (
          <Card className="divide-y divide-slate-100 p-0">
            {(history ?? []).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-slate-900">{tx.reason}</div>
                  <div className="text-xs text-slate-500">
                    {dayLabel(tx.created_at)}
                  </div>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${
                    tx.points >= 0 ? "text-brand-800" : "text-slate-600"
                  }`}
                >
                  {tx.points >= 0 ? "+" : "−"}
                  {num(Math.abs(tx.points))}
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <Empty>No points yet. Check in to an activity to earn your first.</Empty>
        )}
      </Section>
    </main>
  );
}
