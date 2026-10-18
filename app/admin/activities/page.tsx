import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Empty, Section } from "@/components/ui";
import { RoleShell } from "@/app/role-shell";
import { ActivityForm } from "./activity-form";
import { ActivityCard, type ActivityRow } from "./activity-row";
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

  const rows = (activities ?? []) as (Poster & ActivityRow)[];

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
                <ActivityCard key={activity.id} activity={activity} />
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
