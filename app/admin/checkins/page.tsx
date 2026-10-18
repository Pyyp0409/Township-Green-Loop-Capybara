import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, CircleAlert, MapPin } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Section } from "@/components/ui";
import { RoleShell } from "@/app/role-shell";
import { dayLabel } from "@/lib/format";
import { reviewCheckIn } from "../actions";

export const metadata = { title: "Check-ins · Admin" };

type Row = {
  id: number;
  user_id: string;
  full_name: string | null;
  activity_title: string;
  points: number;
  location: string | null;
  code_given: string | null;
  code_matched: boolean | null;
  note: string | null;
  status: string;
  created_at: string;
};

export default async function AdminCheckinsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fadmin%2Fcheckins");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_checkin_queue");
  const rows = (data as Row[] | null) ?? [];

  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending").slice(0, 20);

  return (
    <RoleShell profile={profile} area="Developer admin">
      <Link
        href="/admin"
        className="mt-5 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Overview
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">Check-in requests</h1>
      <p className="mt-1 text-sm text-slate-600">
        Points are only added when you approve. The code is evidence, not proof —
        confirm the person really took part.
      </p>

      {error ? (
        <Card className="mt-5 text-sm text-rose-700">
          Could not load the queue: {error.message}
        </Card>
      ) : null}

      <Section title={`Waiting (${pending.length})`}>
        {pending.length > 0 ? (
          <div className="space-y-3">
            {pending.map((row) => (
              <Card key={row.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {row.full_name ?? "Resident"}
                    </p>
                    <p className="text-sm text-slate-700">{row.activity_title}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    +{row.points}
                  </span>
                </div>

                {row.location ? (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {row.location}
                  </p>
                ) : null}

                <p className="mt-1 text-xs text-slate-400">
                  Asked {dayLabel(row.created_at)}
                </p>

                <div className="mt-2.5">
                  {row.code_given ? (
                    row.code_matched ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-200">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                        Code matches: {row.code_given}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                        <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                        Wrong code: {row.code_given}
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      No code given
                    </span>
                  )}
                </div>

                {row.note ? (
                  <p className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
                    &ldquo;{row.note}&rdquo;
                  </p>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <form action={reviewCheckIn} className="flex-1">
                    <input type="hidden" name="request_id" value={row.id} />
                    <input type="hidden" name="approve" value="true" />
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white"
                    >
                      Approve · +{row.points}
                    </button>
                  </form>
                  <form action={reviewCheckIn} className="flex-1">
                    <input type="hidden" name="request_id" value={row.id} />
                    <input type="hidden" name="approve" value="false" />
                    <input
                      type="hidden"
                      name="reason"
                      value="We could not confirm you took part."
                    />
                    <button
                      type="submit"
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-200"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>Nothing waiting. Every request has been reviewed.</Empty>
        )}
      </Section>

      {done.length > 0 ? (
        <Section title="Recently reviewed">
          <Card className="divide-y divide-slate-100 p-0">
            {done.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-900">
                    {row.full_name ?? "Resident"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {row.activity_title}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-medium ${
                    row.status === "approved" ? "text-brand-700" : "text-rose-700"
                  }`}
                >
                  {row.status === "approved" ? `+${row.points}` : "Rejected"}
                </span>
              </div>
            ))}
          </Card>
        </Section>
      ) : null}
    </RoleShell>
  );
}
