import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, RiskBadge } from "@/components/ui";
import { Disclaimer } from "@/lib/disclaimer";
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

      <Disclaimer className="mt-8" />
    </main>
  );
}
