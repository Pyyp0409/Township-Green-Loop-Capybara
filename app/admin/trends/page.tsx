import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Progress, Section, Stat, TILE_TINTS } from "@/components/ui";
import { RoleShell } from "@/app/role-shell";
import {
  InvestorTrend,
  MembershipTrend,
  PoolsTrend,
  RaisedTrend,
  RewardTrend,
  type TrendPoint,
} from "@/components/charts/trend-charts";
import { num, rm } from "@/lib/format";

export const metadata = { title: "Trends · Admin" };

type PoolTotal = {
  pool_id: string;
  pool_name: string;
  risk: string;
  target: number;
  raised: number;
  investors: number;
  resident_amount: number;
  supporter_amount: number;
};

/** Month on month, as a percentage. Null when there is nothing to compare to. */
function change(series: number[]): number | null {
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (prev === 0) return last === 0 ? 0 : null;
  return ((last - prev) / prev) * 100;
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        up ? "text-brand-700" : "text-rose-700"
      }`}
    >
      {up ? (
        <TrendingUp className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <TrendingDown className="h-3.5 w-3.5" aria-hidden />
      )}
      {up ? "+" : ""}
      {value.toFixed(0)}% vs last month
    </span>
  );
}

export default async function AdminTrendsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fadmin%2Ftrends");

  const supabase = await createClient();
  const [{ data: trendData, error }, { data: poolData }] = await Promise.all([
    supabase.rpc("admin_trends", { p_months: 12 }),
    supabase.rpc("pool_totals"),
  ]);

  const missing =
    !!error && /not find the function|does not exist/i.test(error.message);

  const trends = (trendData as TrendPoint[] | null) ?? [];
  const pools = (poolData as PoolTotal[] | null) ?? [];

  const totalRaised =
    trends.length > 0 ? Number(trends[trends.length - 1].cumulative_raised) : 0;
  const totalPaid = trends.reduce((sum, t) => sum + Number(t.paid_out), 0);
  const totalPoints = trends.reduce((sum, t) => sum + Number(t.points_issued), 0);
  const totalInvestors = trends.reduce((sum, t) => sum + Number(t.new_investors), 0);

  const raisedChange = change(trends.map((t) => Number(t.raised)));
  const investorChange = change(trends.map((t) => Number(t.new_investors)));
  const paidChange = change(trends.map((t) => Number(t.paid_out)));
  const pointsChange = change(trends.map((t) => Number(t.points_issued)));

  return (
    <RoleShell profile={profile} area="Developer admin">
      <Link
        href="/admin"
        className="mt-5 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Overview
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">Overview on trend</h1>
      <p className="mt-1 text-sm text-slate-600">
        The last twelve months, so you can see direction rather than only
        today&apos;s totals.
      </p>

      {missing ? (
        <Card className="mt-5 ring-amber-300">
          <p className="text-sm font-semibold text-amber-800">
            Trends are not set up yet
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            Run <code>supabase/setup_v7.sql</code> in the Supabase SQL editor to
            create the two functions this page reads from.
          </p>
        </Card>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Raised to date" value={rm(totalRaised)} tint={TILE_TINTS[0]} />
        <Stat
          label="Investments made"
          value={num(totalInvestors)}
          tint={TILE_TINTS[1]}
        />
        <Stat label="Paid out" value={rm(totalPaid)} tint={TILE_TINTS[2]} />
        <Stat label="Points issued" value={num(totalPoints)} tint={TILE_TINTS[3]} />
      </div>

      <Section title="Money raised">
        {trends.length > 0 ? (
          <Card>
            <RaisedTrend data={trends} />
            <div className="mt-2">
              <Delta value={raisedChange} />
            </div>
          </Card>
        ) : (
          <Empty>No investments yet.</Empty>
        )}
      </Section>

      <Section title="Investor trend">
        {trends.length > 0 ? (
          <Card>
            <InvestorTrend data={trends} />
            <div className="mt-2">
              <Delta value={investorChange} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              New members are everyone who joined; investors are the ones who put
              money in that month.
            </p>
          </Card>
        ) : (
          <Empty>No members yet.</Empty>
        )}
      </Section>

      <Section title="Pools trend">
        {trends.length > 0 ? (
          <Card>
            <PoolsTrend data={trends} />
            <p className="mt-2 text-xs text-slate-500">
              Stacked, so the height is the month&apos;s total and each band is one
              pool.
            </p>
          </Card>
        ) : (
          <Empty>No investments yet.</Empty>
        )}
      </Section>

      <Section title="Where each pool stands">
        {pools.length > 0 ? (
          <div className="space-y-3">
            {pools.map((pool) => {
              const raised = Number(pool.raised);
              const residentShare =
                raised > 0 ? (Number(pool.resident_amount) / raised) * 100 : 100;
              return (
                <Card key={pool.pool_id}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">
                      {pool.pool_name}
                    </span>
                    <span className="tabular shrink-0 text-sm font-semibold text-brand-800">
                      {rm(raised)}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <Progress value={raised} max={Number(pool.target)} />
                    <div className="mt-1.5 flex justify-between text-xs text-slate-500">
                      <span>of {rm(pool.target)} target</span>
                      <span>{num(pool.investors)} investors</span>
                    </div>
                  </div>
                  <p
                    className={`mt-2 text-xs ${
                      residentShare < 70 ? "text-amber-700" : "text-slate-500"
                    }`}
                  >
                    Residents hold {residentShare.toFixed(0)}% of this pool
                    {residentShare < 70 ? " — below the 70% rule" : ""}
                  </p>
                </Card>
              );
            })}
          </div>
        ) : (
          <Empty>No pools found.</Empty>
        )}
      </Section>

      <Section title="Residents and supporters">
        {trends.length > 0 ? (
          <Card>
            <MembershipTrend data={trends} />
            <p className="mt-2 text-xs text-slate-500">
              Residents should stay the larger share of every raise.
            </p>
          </Card>
        ) : (
          <Empty>No investments yet.</Empty>
        )}
      </Section>

      <Section title="Payouts and points">
        {trends.length > 0 ? (
          <Card>
            <RewardTrend data={trends} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <Delta value={paidChange} />
              <Delta value={pointsChange} />
            </div>
          </Card>
        ) : (
          <Empty>Nothing paid out yet.</Empty>
        )}
      </Section>
    </RoleShell>
  );
}
