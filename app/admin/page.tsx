import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Gift,
  FileSpreadsheet,
  MessageSquareHeart,
  LineChart,
  Tag,
  Users,
  UsersRound,
} from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Progress, Section, Stat, TILE_TINTS } from "@/components/ui";
import { PoolChart, type PoolSlice } from "@/components/charts/pool-chart";
import { RoleShell } from "@/app/role-shell";
import { num, rm } from "@/lib/format";
import { PayoutButton } from "./payout-button";

export const metadata = { title: "Admin" };

const MANAGE = [
  {
    href: "/admin/checkins",
    label: "Check-in requests",
    hint: "Confirm who really took part, then release the points",
    icon: BadgeCheck,
  },
  {
    href: "/admin/activities",
    label: "Activities",
    hint: "Check-in codes and printable QR posters",
    icon: CalendarDays,
  },
  {
    href: "/admin/promotions",
    label: "Promotions",
    hint: "Propose offers; the shop has to agree first",
    icon: Tag,
  },
  {
    href: "/admin/rewards",
    label: "Rewards",
    hint: "Catalogue, stock and availability",
    icon: Gift,
  },
  {
    href: "/admin/residents",
    label: "Residents and levels",
    hint: "Who sits at which badge, and what they have invested",
    icon: UsersRound,
  },
  {
    href: "/admin/community",
    label: "Community",
    hint: "Reports, hiding posts and announcements",
    icon: Users,
  },
  {
    href: "/admin/feedback",
    label: "Feedback",
    hint: "Ratings by area, reply and pass it on",
    icon: MessageSquareHeart,
  },
  {
    href: "/admin/reports",
    label: "Reports",
    hint: "Download investments, points, impact and feedback as CSV",
    icon: FileSpreadsheet,
  },
];

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
          {[
            // The two headcounts stay white; the four money and impact tiles
            // carry the pastels, so the eye goes to the numbers that move.
            { label: "Residents", value: num(overview?.residents ?? 0) },
            { label: "Investors", value: num(overview?.investors ?? 0) },
            { label: "Paid out", value: rm(overview?.paid_out ?? 0), tinted: true },
            {
              label: "Points issued",
              value: num(overview?.points_issued ?? 0),
              tinted: true,
            },
            {
              label: "Mall credits",
              value: rm(overview?.mall_credits_value ?? 0),
              tinted: true,
            },
            {
              label: "tCO₂e / year",
              value: num(overview?.co2_t_per_year ?? 0, 1),
              tinted: true,
            },
          ].map((tile, index) => (
            <Stat
              key={tile.label}
              label={tile.label}
              value={tile.value}
              tint={tile.tinted ? TILE_TINTS[(index - 2) % TILE_TINTS.length] : undefined}
            />
          ))}
        </div>
      )}

      <Link href="/admin/trends" className="mt-6 block">
        <Card className="flex items-center gap-3 ring-brand-200">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <LineChart className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">
              Overview details
            </span>
            <span className="block text-xs text-slate-500">
              Twelve months of investor, pool, payout and points trends
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        </Card>
      </Link>

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
          {MANAGE.map(({ href, label, hint, icon: Icon }) => (
            <Link key={href} href={href} className="block">
              <Card className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0 text-brand-700" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">
                    {label}
                  </span>
                  <span className="block text-xs text-slate-500">{hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              </Card>
            </Link>
          ))}
        </div>
      </Section>

    </RoleShell>
  );
}
