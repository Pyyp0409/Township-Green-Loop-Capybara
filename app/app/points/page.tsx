import Link from "next/link";
import { CheckCircle2, Clock, Info, MapPin, Sparkles, XCircle } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Section, Stat } from "@/components/ui";
import { dayLabel, num } from "@/lib/format";
import { CheckInForm } from "./check-in-form";

export const metadata = { title: "Points" };

const STATUS = {
  pending: { label: "Waiting for the admin", Icon: Clock, tone: "text-amber-700" },
  approved: { label: "Approved", Icon: CheckCircle2, tone: "text-brand-700" },
  rejected: { label: "Not approved", Icon: XCircle, tone: "text-rose-700" },
} as const;

export default async function PointsPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const isSupporter = profile?.membership === "supporter";

  // Never select checkin_code here — it belongs on the printed poster only.
  const [{ data: points }, { data: activities }, { data: history }, { data: requests }] =
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
      supabase
        .from("checkin_requests")
        .select("id, activity_id, status, created_at, review_reason")
        .order("created_at", { ascending: false }),
    ]);

  const activityName = new Map(
    (activities ?? []).map((a) => [a.id as number, a.title as string]),
  );

  // Energy-saving points come from a bill upload, not a check-in.
  const checkInable = (activities ?? []).filter((a) => a.kind !== "energy_saving");
  const waiting = (requests ?? []).filter((r) => r.status === "pending").length;

  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Points</h1>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Your balance" value={num(points ?? 0)} />
        <Stat
          label="Waiting for approval"
          value={num(waiting)}
          hint={waiting > 0 ? "An admin is checking" : "Nothing pending"}
        />
      </div>

      <Link
        href="/app/points-guide"
        className="mt-3 flex items-center gap-2.5 rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200"
      >
        <Info className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
        <span className="flex-1 text-slate-700">
          See every way to earn and spend points
        </span>
      </Link>

      {isSupporter ? (
        <Section title="Earning points as a supporter">
          <Card>
            <p className="flex gap-2.5 text-sm leading-relaxed text-slate-700">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              <span>
                You fund this township from {profile?.home_city ?? "elsewhere"},
                so activity check-ins are not open to you — those are for people
                who turn up in person. You can still build points by converting
                wallet money, and spend them at the malls whenever you visit.
              </span>
            </p>
            <Link
              href="/app/wallet"
              className="mt-3 inline-block rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white"
            >
              Convert wallet money to points
            </Link>
          </Card>
        </Section>
      ) : (
        <Section title="Ask to check in">
          <CheckInForm
            activities={checkInable as { id: number; title: string; points: number }[]}
          />
        </Section>
      )}

      {(requests ?? []).length > 0 ? (
        <Section title="My check-in requests">
          <Card className="divide-y divide-slate-100 p-0">
            {(requests ?? []).map((request) => {
              const meta = STATUS[request.status as keyof typeof STATUS] ?? STATUS.pending;
              return (
                <div key={request.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900">
                      {activityName.get(request.activity_id) ?? "Activity"}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${meta.tone}`}
                    >
                      <meta.Icon className="h-3.5 w-3.5" aria-hidden />
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Asked {dayLabel(request.created_at)}
                  </p>
                  {request.review_reason ? (
                    <p className="mt-1 text-xs text-slate-600">
                      Admin note: {request.review_reason}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </Card>
        </Section>
      ) : null}

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
                  className={`tabular shrink-0 text-sm font-semibold ${
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
          <Empty>No points yet. Ask to check in to an activity to earn your first.</Empty>
        )}
      </Section>
    </main>
  );
}
