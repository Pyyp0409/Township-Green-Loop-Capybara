import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, RiskBadge } from "@/components/ui";
import { pct, rm } from "@/lib/format";
import type { Pool } from "@/lib/types";

export const metadata = { title: "Invest" };

export default async function InvestPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pools")
    .select("*")
    .order("rate", { ascending: true });
  const pools = (data as Pool[] | null) ?? [];

  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Invest</h1>
      <p className="mt-1 text-sm text-slate-600">
        Three ways to fund your township&apos;s energy. Pick one to see the assets
        and the risk statement.
      </p>

      <div className="mt-5 space-y-3">
        {pools.map((pool) => (
          <Link key={pool.id} href={`/app/invest/${pool.id}`} className="block">
            <Card>
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-slate-900">{pool.name}</span>
                <RiskBadge poolId={pool.id} risk={pool.risk} />
              </div>
              <p className="mt-2 text-sm text-slate-600">{pool.description}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-slate-500">Return</dt>
                  <dd className="font-medium text-slate-900">{pct(pool.rate)}/yr</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Payback</dt>
                  <dd className="font-medium text-slate-900">
                    {pool.payback_years} years
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Amount</dt>
                  <dd className="font-medium text-slate-900">
                    {rm(pool.min_invest)}–{rm(pool.max_invest)}
                  </dd>
                </div>
              </dl>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                View assets
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <Link href="/app/risk" className="mt-4 block">
        <Card className="flex items-start gap-3 ring-brand-200">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <ShieldCheck className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">
              Risk management
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">
              Where your money goes, who holds it, who pays it back, and what is
              not covered. The whole chain, in the open.
            </span>
            <span className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
              Read before you invest
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </span>
        </Card>
      </Link>

    </main>
  );
}
