import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Section } from "@/components/ui";
import { RoleShell } from "@/app/role-shell";
import { dayLabel } from "@/lib/format";
import { ActivityForm } from "./activity-form";
import { PosterSheet, PrintButton, type Poster } from "./poster";

export const metadata = { title: "Activities · Admin" };

export default async function AdminActivitiesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fadmin%2Factivities");

  const supabase = await createClient();
  // Admins are the only role meant to read checkin_code.
  const { data: activities } = await supabase
    .from("activities")
    .select("id, title, kind, points, location, starts_at, checkin_code")
    .order("id");

  const rows = (activities ?? []) as (Poster & {
    kind: string;
    starts_at: string | null;
  })[];

  return (
    <RoleShell profile={profile} area="Developer admin">
      <div className="print:hidden">
        <Link
          href="/admin"
          className="mt-5 inline-flex items-center gap-1 text-sm text-slate-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Overview
        </Link>

        <div className="mt-3 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Activities</h1>
          <PrintButton />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Check-in codes appear here only. Print the posters and put them up at the
          activity.
        </p>

        <Section title="All activities">
          {rows.length > 0 ? (
            <div className="space-y-3">
              {rows.map((activity) => (
                <Card key={activity.id}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900">
                      {activity.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      +{activity.points}
                    </span>
                  </div>
                  <p className="mt-1 text-xs capitalize text-slate-500">
                    {activity.kind.replace("_", " ")}
                  </p>
                  {activity.location ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {activity.location}
                    </p>
                  ) : null}
                  {activity.starts_at ? (
                    <p className="mt-1 text-xs text-slate-400">
                      {dayLabel(activity.starts_at)}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    Check-in code:{" "}
                    {activity.checkin_code ? (
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold tracking-widest text-slate-800">
                        {activity.checkin_code}
                      </code>
                    ) : (
                      <span className="text-slate-400">
                        none — awarded automatically
                      </span>
                    )}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <Empty>No activities yet.</Empty>
          )}
        </Section>

        <Section title="Add an activity">
          <ActivityForm />
        </Section>
      </div>

      <PosterSheet activities={rows} />
    </RoleShell>
  );
}
