import Link from "next/link";
import { FileText, Gift, Receipt, Users } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, QuickAction, Section, Stat } from "@/components/ui";
import { dayLabel, num, rm } from "@/lib/format";

export const metadata = { title: "Home" };

export default async function ResidentHome() {
  const supabase = await createClient();
  const profile = await getProfile();

  const [
    { data: points },
    { data: wallet },
    { data: investments },
    { data: lastPayout },
  ] = await Promise.all([
    supabase.rpc("my_points"),
    supabase.rpc("my_wallet"),
    supabase.from("investments").select("amount, pool_id, asset_id").eq("status", "active"),
    supabase
      .from("payouts")
      .select("amount, paid_at")
      .order("paid_at", { ascending: false })
      .limit(1),
  ]);

  const invested = (investments ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );

  // The resident's share of an asset's CO2 = their stake / the asset's target.
  const assetIds = [
    ...new Set((investments ?? []).map((i) => i.asset_id).filter(Boolean)),
  ] as number[];
  let co2Share = 0;
  if (assetIds.length > 0) {
    const { data: assets } = await supabase
      .from("assets")
      .select("id, funding_target, co2_t_per_year")
      .in("id", assetIds);
    for (const asset of assets ?? []) {
      const mine = (investments ?? [])
        .filter((i) => i.asset_id === asset.id)
        .reduce((sum, i) => sum + Number(i.amount), 0);
      const target = Number(asset.funding_target);
      if (target > 0) {
        co2Share += (mine / target) * Number(asset.co2_t_per_year ?? 0);
      }
    }
  }

  const latest = lastPayout?.[0];

  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">
        Hello, {profile?.full_name ?? "neighbour"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {profile?.township ?? "City of Elmina"}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Wallet" value={rm(wallet ?? 0)} />
        <Stat label="Points" value={num(points ?? 0)} />
        <Stat label="Total invested" value={rm(invested)} />
        <Stat
          label="Your CO₂ share"
          value={`${co2Share.toFixed(2)} t/yr`}
          hint="From the assets you fund"
        />
      </div>

      <Section title="Last payout">
        {latest ? (
          <Card>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-semibold text-brand-800">
                {rm(latest.amount)}
              </span>
              <span className="text-xs text-slate-500">
                {dayLabel(latest.paid_at)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Payouts land in your wallet each month while an investment is running.
            </p>
          </Card>
        ) : (
          <Card className="text-sm text-slate-500">
            No payouts yet.{" "}
            <Link href="/app/invest" className="font-medium text-brand-700">
              Start investing
            </Link>{" "}
            and your first payout appears here.
          </Card>
        )}
      </Section>

      <Section title="Quick actions">
        <div className="grid grid-cols-4 gap-3">
          <QuickAction
            href="/app/bills"
            tint="#EBCFFF"
            icon={<Receipt className="h-5 w-5" aria-hidden />}
            label="Bills"
          />
          <QuickAction
            href="/app/rewards"
            tint="#FFE4ED"
            icon={<Gift className="h-5 w-5" aria-hidden />}
            label="Rewards"
          />
          <QuickAction
            href="/app/portfolio"
            tint="#CBECFF"
            icon={<FileText className="h-5 w-5" aria-hidden />}
            label="Portfolio"
          />
          <QuickAction
            href="/community"
            tint="#DDF1D1"
            icon={<Users className="h-5 w-5" aria-hidden />}
            label="Community"
          />
        </div>
      </Section>

    </main>
  );
}
