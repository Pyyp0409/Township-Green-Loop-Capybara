import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, ChevronRight, Gift } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Progress, Section, Stat } from "@/components/ui";
import { PoolChart, type PoolSlice } from "@/components/charts/pool-chart";
import { RoleShell } from "@/app/role-shell";
import { Disclaimer } from "@/lib/disclaimer";
import { num, rm } from "@/lib/format";
import { PayoutButton } from "./payout-button";

export const metadata = { title: "Admin" };

type Overview = {
  residents: number;
  investors: number;
  raised_by_pool: Record<string, number>;
  paid_out: number;
  points_issued: number;
  mall_credits_value: number;
  co2_t_per_year: number;
};

export default async function AdminHome() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fadmin");

  const supabase = await createClient();
  const [
    { data: overviewData, error },
    { data: assets },
    { data: progress },
    { data: pools },
  ] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase
      .from("assets")
      .select("id, name, pool_id, funding_target, status")
      .order("id"),
    supabase.rpc("asset_progress"),
    supabase.from("pools").select("id, name"),
  ]);

  const overview = overviewData as Overview | null;
  const poolName = new Map(
    (pools ?? []).map((p) => [p.id as string, p.name as string]),
  );

  const raisedBy = overview?.raised_by_pool ?? {};
  const poolSlices: PoolSlice[] = Object.entries(raisedBy).map(([id, total]) => ({
    name: poolName.get(id) ?? id,
    value: Number(total),
  }));

  const raisedFor = new Map<number, { raised: number; investors: number }>();
  for (const row of (progress as
    | { asset_id: number; raised: number; investors: number }[]
    | null) ?? []) {
    raisedFor.set(row.asset_id, {
      raised: Number(row.raised),
      investors: Number(row.investors),
    });
  }

  return (
    <RoleShell profile={profile} area="Developer admin">
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Township overview</h1>

      {error ? (
        <Card className="mt-5 text-sm text-rose-700">
          Could not load the overview: {error.message}
        </Card>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat label="Residents" value={num(overview?.residents ?? 0)} />
          <Stat label="Investors" value={num(overview?.investors ?? 0)} />
          <Stat label="Paid out" value={rm(overview?.paid_out ?? 0)} />
          <Stat label="Points issued" value={num(overview?.points_issued ?? 0)} />
          <Stat label="Mall credits" value={rm(overview?.mall_credits_value ?? 0)} />
          <Stat label="tCO₂e / year" value={num(overview?.co2_t_per_year ?? 0, 1)} />
        </div>
      )}

      <Section title="Raised by pool">
        {poolSlices.length > 0 ? (
          <Card>
            <PoolChart data={poolSlices} />
          </Card>
        ) : (
          <Empty>No active investments yet.</Empty>
        )}
      </Section>

      <Section title="Assets">
        <div className="space-y-3">
          {(assets ?? []).map((asset) => {
            const info = raisedFor.get(asset.id);
            const raised = info?.raised ?? 0;
            const target = Number(asset.funding_target);
            return (
              <Card key={asset.id}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900">
                    {asset.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] capitalize text-slate-600">
                    {asset.status}
                  </span>
                </div>
                <div className="mt-3">
                  <Progress value={raised} max={target} />
                  <div className="mt-1.5 flex justify-between text-xs text-slate-500">
                    <span>
                      <span className="font-medium text-slate-900">{rm(raised)}</span>{" "}
                      of {rm(target)}
                    </span>
                    <span>{num(info?.investors ?? 0)} investors</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section title="Run a demo payout">
        <PayoutButton />
      </Section>

      <Section title="Manage">
        <div className="space-y-3">
          <Link href="/admin/activities" className="block">
            <Card className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-brand-700" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">
                  Activities
                </span>
                <span className="block text-xs text-slate-500">
                  Check-in codes and printable QR posters
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </Card>
          </Link>
          <Link href="/admin/rewards" className="block">
            <Card className="flex items-center gap-3">
              <Gift className="h-5 w-5 text-brand-700" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">
                  Rewards
                </span>
                <span className="block text-xs text-slate-500">
                  Catalogue, stock and availability
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </Card>
          </Link>
        </div>
      </Section>

      <Disclaimer className="mt-8" />
    </RoleShell>
  );
}
