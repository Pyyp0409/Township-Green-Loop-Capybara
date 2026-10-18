import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Empty, Section, Stat } from "@/components/ui";
import { PayoutsChart, type PayoutPoint } from "@/components/charts/payouts-chart";
import {
  AllocationChart,
  type AllocationSlice,
} from "@/components/charts/allocation-chart";
import { dayLabel, monthLabel, rm } from "@/lib/format";

export const metadata = { title: "Portfolio" };

// Fixed per pool so the donut, the legend and the pool rows always agree.
const POOL_COLOR: Record<string, string> = {
  solar: "#215D4A",
  upgrade: "#4A917C",
  ev: "#99C5B5",
};

export default async function PortfolioPage() {
  const supabase = await createClient();

  const [{ data: investments }, { data: payouts }, { data: pools }] =
    await Promise.all([
      supabase
        .from("investments")
        .select("id, pool_id, amount, status, created_at, asset_id")
        .order("created_at", { ascending: false }),
      supabase
        .from("payouts")
        .select("id, amount, kind, paid_at, investment_id")
        .order("paid_at", { ascending: true }),
      supabase.from("pools").select("id, name"),
    ]);

  const poolName = new Map(
    (pools ?? []).map((p) => [p.id as string, p.name as string]),
  );

  const byPool = new Map<string, { total: number; count: number }>();
  for (const inv of investments ?? []) {
    if (inv.status !== "active") continue;
    const current = byPool.get(inv.pool_id) ?? { total: 0, count: 0 };
    current.total += Number(inv.amount);
    current.count += 1;
    byPool.set(inv.pool_id, current);
  }

  const invested = [...byPool.values()].reduce((sum, p) => sum + p.total, 0);
  const paidOut = (payouts ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const profit = (payouts ?? [])
    .filter((p) => p.kind === "profit")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const allocation: AllocationSlice[] = [...byPool.entries()].map(
    ([poolId, info]) => ({
      name: poolName.get(poolId) ?? poolId,
      value: info.total,
      color: POOL_COLOR[poolId] ?? "#6FAE99",
    }),
  );

  // Cumulative payouts by month, for the chart.
  const monthly = new Map<string, number>();
  for (const payout of payouts ?? []) {
    const key = monthLabel(payout.paid_at);
    monthly.set(key, (monthly.get(key) ?? 0) + Number(payout.amount));
  }
  let running = 0;
  const chartData: PayoutPoint[] = [...monthly.entries()].map(([month, amount]) => {
    running += amount;
    return { month, cumulative: Number(running.toFixed(2)) };
  });

  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Portfolio</h1>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Active investments" value={rm(invested)} />
        <Stat label="Paid out so far" value={rm(paidOut)} />
        <Stat label="Profit received" value={rm(profit)} />
        <Stat
          label="Capital returned"
          value={rm(paidOut - profit)}
          hint="Principal repaid to your wallet"
        />
      </div>

      <Section title="Where your money sits">
        {allocation.length > 0 ? (
          <Card>
            <AllocationChart data={allocation} total={invested} />
            <ul className="mt-3 space-y-2">
              {allocation.map((slice) => {
                const share = invested > 0 ? (slice.value / invested) * 100 : 0;
                return (
                  <li
                    key={slice.name}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: slice.color }}
                        aria-hidden
                      />
                      <span className="truncate text-slate-700">{slice.name}</span>
                    </span>
                    <span className="tabular shrink-0 text-slate-900">
                      {rm(slice.value)}
                      <span className="ml-2 text-xs text-slate-500">
                        {share.toFixed(0)}%
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : (
          <Empty>
            Nothing invested yet.{" "}
            <Link href="/app/invest" className="font-medium text-brand-700">
              Browse the three pools
            </Link>
            .
          </Empty>
        )}
      </Section>

      {chartData.length > 0 ? (
        <Section title="Payouts over time">
          <Card>
            <PayoutsChart data={chartData} />
            <p className="mt-2 text-xs text-slate-500">
              Everything paid into your wallet so far, month by month.
            </p>
          </Card>
        </Section>
      ) : null}

      <Section title="Payout history">
        {(payouts ?? []).length > 0 ? (
          <Card className="divide-y divide-slate-100 p-0">
            {[...(payouts ?? [])].reverse().map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium capitalize text-slate-900">
                    {payout.kind.replace("_", " ")}
                  </div>
                  <div className="text-xs text-slate-500">
                    {dayLabel(payout.paid_at)}
                  </div>
                </div>
                <span className="tabular text-sm font-semibold text-brand-800">
                  {rm(payout.amount)}
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <Empty>
            No payouts yet. Payouts appear monthly once an asset is running.
          </Empty>
        )}
      </Section>

    </main>
  );
}
