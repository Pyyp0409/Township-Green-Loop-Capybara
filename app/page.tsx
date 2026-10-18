import Link from "next/link";
import { ArrowRight, Leaf, Sun, Store, Zap } from "lucide-react";
import { createClient, getProfile, homeFor } from "@/lib/supabase/server";
import { num, pct, rm } from "@/lib/format";
import type { Pool, TownshipImpact } from "@/lib/types";

const POOL_ICON: Record<string, React.ReactNode> = {
  solar: <Sun className="h-5 w-5" aria-hidden />,
  upgrade: <Store className="h-5 w-5" aria-hidden />,
  ev: <Zap className="h-5 w-5" aria-hidden />,
};

const HOW_IT_WORKS = [
  {
    title: "Invest",
    body: "From RM100 into rooftop solar, mall shop upgrades or EV charging.",
  },
  {
    title: "Earn",
    body: "Monthly payouts land in your wallet while the asset runs.",
  },
  {
    title: "Collect points",
    body: "Recycle, join events and cut your own electricity to earn points.",
  },
  {
    title: "Spend at the mall",
    body: "Turn wallet money into mall credit worth 10% more, paid by the shops.",
  },
];

function riskBadge(poolId: string, risk: string) {
  const label = poolId === "ev" ? "High risk – capital not guaranteed" : risk;
  const tone =
    poolId === "ev"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : "bg-brand-50 text-brand-700 ring-brand-200";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tone}`}>
      {label}
    </span>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const [{ data: impactData }, { data: poolData }, profile] = await Promise.all([
    supabase.rpc("township_impact"),
    supabase.from("pools").select("*").order("rate", { ascending: true }),
    getProfile(),
  ]);

  const impact = (impactData as TownshipImpact | null) ?? {
    raised: 0,
    investors: 0,
    co2_t_per_year: 0,
    solar_kwp: 0,
  };
  const pools = (poolData as Pool[] | null) ?? [];

  const stats = [
    { label: "Raised by residents", value: rm(impact.raised) },
    { label: "Resident investors", value: num(impact.investors) },
    { label: "tCO₂e avoided / year", value: num(impact.co2_t_per_year, 1) },
    { label: "Solar installed", value: `${num(impact.solar_kwp)} kWp` },
  ];

  return (
    <main className="mx-auto w-full max-w-screen-sm px-4 pb-16 pt-10 sm:max-w-3xl">
      <header className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-semibold text-brand-800">
          <Leaf className="h-5 w-5" aria-hidden />
          Township Green Loop
        </span>
        <Link
          href={profile ? homeFor(profile) : "/login"}
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white"
        >
          {profile ? "Open app" : "Sign in"}
        </Link>
      </header>

      <h1 className="mt-10 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
        Your township&apos;s energy, funded by the people who live in it.
      </h1>
      <p className="mt-3 text-slate-600">
        Put as little as RM100 into rooftop solar, mall shop energy upgrades or EV
        charging. Live here and you also earn points for recycling and lower
        bills. Live elsewhere and you can still fund the township&apos;s solar —
        and watch its carbon drop.
      </p>

      <section aria-label="Township impact" className="mt-8 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
          >
            <div className="text-xl font-semibold text-brand-800">{s.value}</div>
            <div className="mt-1 text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </section>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">How it works</h2>
      <ol className="mt-3 space-y-3">
        {HOW_IT_WORKS.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
              {index + 1}
            </span>
            <span>
              <span className="block text-sm font-medium text-slate-900">
                {step.title}
              </span>
              <span className="block text-sm text-slate-600">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Three pools</h2>
      <div className="mt-3 space-y-3">
        {pools.map((pool) => (
          <article
            key={pool.id}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
                <span className="text-brand-700">{POOL_ICON[pool.id]}</span>
                {pool.name}
              </span>
              {riskBadge(pool.id, pool.risk)}
            </div>
            <p className="mt-2 text-sm text-slate-600">{pool.description}</p>
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
              <div>
                <dt className="inline">Return </dt>
                <dd className="inline font-medium text-slate-800">
                  {pct(pool.rate)} a year
                </dd>
              </div>
              {pool.payback_years ? (
                <div>
                  <dt className="inline">Payback </dt>
                  <dd className="inline font-medium text-slate-800">
                    {pool.payback_years} years
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="inline">Amount </dt>
                <dd className="inline font-medium text-slate-800">
                  {rm(pool.min_invest)} – {rm(pool.max_invest)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-slate-500">{pool.rate_type}</p>
          </article>
        ))}
        {pools.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
            Pools could not be loaded. Check the Supabase environment variables.
          </p>
        ) : null}
      </div>

      <Link
        href={profile ? homeFor(profile) : "/signup"}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-3 font-medium text-white"
      >
        {profile ? "Open app" : "Create your account"}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
      {profile ? null : (
        <p className="mt-3 text-sm text-slate-600">
          Already a member?{" "}
          <Link href="/login" className="font-medium text-brand-700">
            Sign in
          </Link>
        </p>
      )}

    </main>
  );
}
