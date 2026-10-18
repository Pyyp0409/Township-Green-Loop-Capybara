import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Section, Stat } from "@/components/ui";
import { RoleShell } from "@/app/role-shell";
import { dayLabel, num, rm } from "@/lib/format";

export const metadata = { title: "Residents · Admin" };

type Level = {
  user_id: string;
  full_name: string | null;
  township: string | null;
  points_now: number;
  lifetime: number;
  badge_id: number | null;
  badge_name: string | null;
  image_path: string | null;
  invested: number;
  joined_at: string;
  membership: string;
};

export default async function AdminResidentsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fadmin%2Fresidents");

  const supabase = await createClient();
  const [{ data, error }, { data: badges }, { data: split }] = await Promise.all([
    supabase.rpc("admin_resident_levels"),
    supabase.from("badges").select("id, name, min_points, image_path").order("min_points"),
    supabase.rpc("admin_membership_split"),
  ]);

  const mix = (split as {
    residents: number;
    supporters: number;
    raised_residents: number;
    raised_supporters: number;
  } | null) ?? {
    residents: 0,
    supporters: 0,
    raised_residents: 0,
    raised_supporters: 0,
  };

  const rows = (data as Level[] | null) ?? [];
  const ladder = badges ?? [];

  // How many residents sit at each level, so the admin can target offers.
  const atLevel = new Map<number | null, number>();
  for (const row of rows) {
    atLevel.set(row.badge_id, (atLevel.get(row.badge_id) ?? 0) + 1);
  }

  const invested = rows.reduce((sum, r) => sum + Number(r.invested), 0);
  const withMoney = rows.filter((r) => Number(r.invested) > 0).length;

  return (
    <RoleShell profile={profile} area="Developer admin">
      <Link
        href="/admin"
        className="mt-5 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Overview
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">Residents and levels</h1>
      <p className="mt-1 text-sm text-slate-600">
        Badges come from points earned over time. Use the levels to decide who to
        invite to which offer.
      </p>

      {error ? (
        <Card className="mt-5 text-sm text-rose-700">
          Could not load residents: {error.message}
        </Card>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat
          label="Live in the township"
          value={num(mix.residents)}
          hint={`${rm(mix.raised_residents)} invested`}
        />
        <Stat
          label="Supporters elsewhere"
          value={num(mix.supporters)}
          hint={`${rm(mix.raised_supporters)} invested`}
        />
        <Stat label="Members in total" value={num(rows.length)} />
        <Stat
          label="Have invested"
          value={num(withMoney)}
          hint={`${rm(invested)} in total`}
        />
      </div>

      <Section title="How many at each level">
        <div className="space-y-2">
          {ladder.map((badge) => {
            const count = atLevel.get(badge.id) ?? 0;
            return (
              <Card key={badge.id} className="flex items-center gap-3">
                <Image
                  src={badge.image_path}
                  alt=""
                  width={40}
                  height={40}
                  className={count > 0 ? "" : "grayscale opacity-50"}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">
                    {badge.name}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {num(badge.min_points)} points and above
                  </span>
                </span>
                <span className="tabular shrink-0 text-lg font-semibold text-brand-800">
                  {num(count)}
                </span>
              </Card>
            );
          })}
          <Card className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
              —
            </span>
            <span className="min-w-0 flex-1 text-sm text-slate-600">
              No badge yet
            </span>
            <span className="tabular shrink-0 text-lg font-semibold text-slate-500">
              {num(atLevel.get(null) ?? 0)}
            </span>
          </Card>
        </div>
      </Section>

      <Section title="Every resident">
        {rows.length > 0 ? (
          <Card className="divide-y divide-slate-100 p-0">
            {rows.map((row) => (
              <div key={row.user_id} className="flex items-center gap-3 px-4 py-3">
                {row.image_path ? (
                  <Image
                    src={row.image_path}
                    alt={row.badge_name ?? ""}
                    title={row.badge_name ?? ""}
                    width={36}
                    height={36}
                    className="shrink-0"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-400">
                    none
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {row.full_name ?? "Resident"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {row.membership === "supporter" ? "Supporter" : "Resident"} ·{" "}
                    {row.badge_name ?? "No badge"} · {row.township ?? "—"} · joined{" "}
                    {dayLabel(row.joined_at)}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="tabular text-sm font-semibold text-brand-800">
                    {num(row.points_now)}
                  </p>
                  <p className="tabular text-xs text-slate-500">
                    {rm(row.invested)}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        ) : (
          <Empty>No residents yet.</Empty>
        )}
      </Section>
    </RoleShell>
  );
}
