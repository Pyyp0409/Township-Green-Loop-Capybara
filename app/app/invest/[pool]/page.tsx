import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Progress, RiskBadge, Section } from "@/components/ui";
import { CheckCircle2, Info, Users } from "lucide-react";
import { num, pct, rm } from "@/lib/format";
import type { Pool } from "@/lib/types";
import { MAX_ACROSS_POOLS, POOL_PLAN, YEARLY_RETAIL_LIMIT } from "@/lib/plan";
import { InvestForm, type AssetChoice } from "./invest-form";

type Params = { pool: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { pool } = await params;
  return { title: `${pool} · Invest` };
}

export default async function PoolDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { pool: poolId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: poolData }, { data: assetData }, { data: progressData }] =
    await Promise.all([
      supabase.from("pools").select("*").eq("id", poolId).maybeSingle(),
      supabase
        .from("assets")
        .select("id, name, funding_target, status, size_kw, co2_t_per_year, note")
        .eq("pool_id", poolId)
        .order("id"),
      supabase.rpc("asset_progress"),
    ]);

  const pool = poolData as Pool | null;
  if (!pool) notFound();

  const plan = POOL_PLAN[pool.id];

  const { data: ack } = user
    ? await supabase
        .from("risk_acknowledgements")
        .select("pool_id")
        .eq("pool_id", poolId)
        .maybeSingle()
    : { data: null };

  const raisedFor = new Map<number, { raised: number; investors: number }>();
  for (const row of (progressData as
    | { asset_id: number; raised: number; investors: number }[]
    | null) ?? []) {
    raisedFor.set(row.asset_id, {
      raised: Number(row.raised),
      investors: Number(row.investors),
    });
  }

  const assets = assetData ?? [];
  // Anything not yet repaid can still take money — a running asset is already
  // producing, so residents may want that one rather than one still raising.
  const choices: AssetChoice[] = assets
    .filter((a) => a.status !== "repaid")
    .map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status as string,
      // Your share of this asset's yearly carbon = your stake / its target.
      co2PerRm:
        Number(a.funding_target) > 0
          ? Number(a.co2_t_per_year ?? 0) / Number(a.funding_target)
          : 0,
      remaining: Math.max(
        0,
        Number(a.funding_target) - (raisedFor.get(a.id)?.raised ?? 0),
      ),
    }));

  return (
    <main>
      <Link
        href="/app/invest"
        className="mt-5 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All pools
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{pool.name}</h1>
        <RiskBadge poolId={pool.id} risk={pool.risk} />
      </div>
      <p className="mt-2 text-sm text-slate-600">{pool.description}</p>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Card>
          <dt className="text-slate-500">Return</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {pct(pool.rate)}/yr
          </dd>
        </Card>
        <Card>
          <dt className="text-slate-500">Payback</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {pool.payback_years} yrs
          </dd>
        </Card>
        <Card>
          <dt className="text-slate-500">Per resident</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {rm(pool.min_invest)}–{rm(pool.max_invest)}
          </dd>
        </Card>
      </dl>
      <p className="mt-2 text-xs text-slate-500">{pool.rate_type}</p>

      {plan ? (
        <Section title="What you should know">
          <Card>
            <ul className="space-y-2.5">
              {plan.facts.map((fact) => (
                <li key={fact} className="flex gap-2.5 text-sm text-slate-700">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                    aria-hidden
                  />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex gap-2.5 rounded-xl bg-brand-50 p-3 text-xs leading-relaxed text-brand-900">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              <span>
                Residents get first priority for the first 14 days of every raise,
                and hold at least 70% of this pool. Supporters can fund whatever
                is left.
              </span>
            </p>
            <p className="mt-2 flex gap-2.5 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span>
                Money is paid back over {plan.paybackLabel}. Across all three pools
                you may hold up to {rm(MAX_ACROSS_POOLS)} at once, and invest at
                most {rm(YEARLY_RETAIL_LIMIT)} in any 12 months. None of the pools
                is a deposit and none is covered by PIDM.
              </span>
            </p>
          </Card>
        </Section>
      ) : null}

      <Section title="Assets in this pool">
        <div className="space-y-3">
          {assets.map((asset) => {
            const progress = raisedFor.get(asset.id);
            const raised = progress?.raised ?? 0;
            const target = Number(asset.funding_target);
            return (
              <Card key={asset.id}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">
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
                      <span className="font-medium text-slate-900">
                        {rm(raised)}
                      </span>{" "}
                      of {rm(target)}
                    </span>
                    <span>{num(progress?.investors ?? 0)} investors</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {asset.size_kw ? `${num(asset.size_kw)} kW · ` : ""}
                  {asset.co2_t_per_year
                    ? `${num(asset.co2_t_per_year, 1)} tCO₂e/yr · `
                    : ""}
                  {asset.note}
                </p>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section title="Invest in this pool">
        {choices.length > 0 ? (
          <InvestForm
            poolId={pool.id}
            poolName={pool.name}
            minInvest={Number(pool.min_invest)}
            maxInvest={Number(pool.max_invest)}
            riskText={pool.risk_text}
            assets={choices}
            alreadyAcknowledged={Boolean(ack)}
          />
        ) : (
          <Card className="text-sm text-slate-500">
            Every asset in this pool has been repaid. Check back when the next one
            opens.
          </Card>
        )}
      </Section>

    </main>
  );
}
