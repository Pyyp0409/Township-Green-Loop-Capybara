import Link from "next/link";
import { ArrowLeft, Banknote, Building2, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Section } from "@/components/ui";
import { pct, rm } from "@/lib/format";
import { POOL_PLAN, YEARLY_RETAIL_LIMIT, MAX_ACROSS_POOLS } from "@/lib/plan";
import type { Pool } from "@/lib/types";

export const metadata = { title: "How we handle risk" };

const CHAIN = [
  {
    Icon: Users,
    title: "You, the resident",
    body: "You choose a pool and an asset, read the risk statement for that pool and tick it. Your money is only taken once you confirm. Nothing is automatic and nothing recurring is set up.",
  },
  {
    Icon: Banknote,
    title: "The licensed platform",
    body: "Money is held by a licensed platform, never by us and never by the township developer. We never see your card or bank details — we store only a masked label so you can tell which method you used.",
  },
  {
    Icon: Building2,
    title: "The asset owner",
    body: "For solar it is the developer/JV, which owns and runs the panels. For shop upgrades it is the installer and the shop. For EV it is a licensed charge point operator who co-invests half the cost and runs the chargers.",
  },
  {
    Icon: ShieldCheck,
    title: "Who pays you back",
    body: "Solar is paid from what tenants, malls and factories pay for the power. Upgrades are paid from 80% of each shop's bill savings. EV is paid only from charging profit. Residents are paid first, before the developer or the platform take their share.",
  },
];

export default async function RiskPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("pools").select("*").order("rate");
  const pools = (data as Pool[] | null) ?? [];

  return (
    <main>
      <Link
        href="/app/invest"
        className="mt-5 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Invest
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">
        How we handle risk
      </h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Where your money goes, who holds it, who pays it back and what happens
        when things go wrong. Nothing here is hidden in small print.
      </p>

      <Section title="Where your money goes">
        <ol className="space-y-3">
          {CHAIN.map((step, index) => (
            <li key={step.title}>
              <Card>
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <step.Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {index + 1}. {step.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {step.body}
                    </p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="What protects you">
        <Card>
          <ul className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <li>
              <span className="font-medium">Limits.</span> Each pool has its own
              maximum per resident, at most {rm(MAX_ACROSS_POOLS)} across all
              three at once, and no more than {rm(YEARLY_RETAIL_LIMIT)} in any
              rolling 12 months. The database refuses anything above these — the
              app cannot override it.
            </li>
            <li>
              <span className="font-medium">A floor on solar.</span> The contract
              rate is 5% a year with a 4.5% floor, backed by the JV sharing part
              of its funding saving.
            </li>
            <li>
              <span className="font-medium">A guarantee on upgrades.</span> The
              installer contract guarantees a minimum saving of RM800 per shop a
              month. Half of each month&apos;s safety margin is kept as a
              bad-debt reserve.
            </li>
            <li>
              <span className="font-medium">A top-up on EV.</span> If a charger
              sells less than 60 kWh a day, partners pay residents for the
              missing kWh, capped at RM3,000 per charger a year.
            </li>
            <li>
              <span className="font-medium">You are paid first.</span> On the EV
              pool the developer and the platform defer their 10% shares until
              residents have their money back.
            </li>
          </ul>
        </Card>
      </Section>

      <Section title="What is not covered">
        <Card className="ring-rose-200">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
            <TriangleAlert className="h-4 w-4" aria-hidden />
            Be clear about this before you invest
          </p>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
            <li>
              None of the pools is a deposit, and none is covered by PIDM.
            </li>
            <li>
              A shop can close. A reserve and the installer guarantee reduce the
              loss, but they do not remove it.
            </li>
            <li>
              EV price wars, cost rises and a refused government grant are{" "}
              <span className="font-medium">not</span> covered by the top-up. In
              our conservative test residents get back about 60% of their money,
              and in a severe case you can lose most of it.
            </li>
            <li>
              Past results and the examples in this app are not a promise of
              future returns.
            </li>
          </ul>
        </Card>
      </Section>

      <Section title="The stress test, pool by pool">
        <div className="space-y-3">
          {pools.map((pool) => {
            const plan = POOL_PLAN[pool.id];
            if (!plan) return null;
            const normal = (plan.normal.total - 1) * 100;
            const bad = (plan.conservative.total - 1) * 100;
            return (
              <Card key={pool.id}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">
                    {pool.name}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {pct(pool.rate)} a year
                  </span>
                </div>
                <dl className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-brand-50 p-2.5">
                    <dt className="text-brand-800">If things go to plan</dt>
                    <dd className="tabular mt-0.5 text-base font-semibold text-brand-800">
                      +{normal.toFixed(1)}%
                    </dd>
                  </div>
                  <div
                    className={`rounded-xl p-2.5 ${
                      bad < 0 ? "bg-rose-50" : "bg-slate-50"
                    }`}
                  >
                    <dt className={bad < 0 ? "text-rose-700" : "text-slate-600"}>
                      If things go badly
                    </dt>
                    <dd
                      className={`tabular mt-0.5 text-base font-semibold ${
                        bad < 0 ? "text-rose-700" : "text-slate-800"
                      }`}
                    >
                      {bad < 0 ? "−" : "+"}
                      {Math.abs(bad).toFixed(1)}%
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {plan.conservativeNote}
                </p>
              </Card>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Both columns are over the pool&apos;s whole payback period.
        </p>
      </Section>

    </main>
  );
}
