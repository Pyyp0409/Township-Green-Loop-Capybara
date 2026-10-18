import Link from "next/link";
import { Clock, Store, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Empty, Section, Stat } from "@/components/ui";
import { CodeQR } from "@/components/qr";
import { dayLabel, num } from "@/lib/format";
import { RedeemButton } from "./redeem-button";

export const metadata = { title: "Rewards" };

type Reward = {
  id: number;
  title: string;
  description: string | null;
  points_cost: number;
  stock: number;
  scope: string;
  mall_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
  limited: boolean;
};

type Promo = {
  id: number;
  shop_name: string | null;
  title: string;
  perk: string;
  description: string | null;
  ends_at: string;
};

export default async function RewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ mall?: string }>;
}) {
  const { mall } = await searchParams;
  const supabase = await createClient();

  const { data: malls } = await supabase.from("malls").select("id, name").order("name");
  const mallList = (malls ?? []) as { id: number; name: string }[];

  // Default to the first mall so the list is never empty on arrival.
  const mallId = Number(mall) || mallList[0]?.id;
  const mallName = mallList.find((m) => m.id === mallId)?.name ?? "";

  const [{ data: points }, { data: rewards }, { data: promos }, { data: redemptions }] =
    await Promise.all([
      supabase.rpc("my_points"),
      mallId
        ? supabase.rpc("rewards_for_mall", { p_mall_id: mallId })
        : Promise.resolve({ data: [] }),
      mallId
        ? supabase.rpc("live_promotions", { p_mall_id: mallId })
        : Promise.resolve({ data: [] }),
      supabase
        .from("redemptions")
        .select("id, reward_id, points_used, code, status, created_at")
        .eq("status", "issued")
        .order("created_at", { ascending: false }),
    ]);

  const balance = Number(points ?? 0);
  const list = (rewards as Reward[] | null) ?? [];
  const offers = (promos as Promo[] | null) ?? [];
  const issued = redemptions ?? [];

  const general = list.filter((r) => r.scope === "general" && !r.limited);
  const specific = list.filter((r) => r.scope !== "general" && !r.limited);
  const limited = list.filter((r) => r.limited);

  const rewardTitle = new Map(list.map((r) => [r.id, r.title]));

  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Rewards</h1>

      <div className="mt-5">
        <Stat label="Your points" value={num(balance)} />
      </div>

      <div className="mt-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Choose a mall</span>
          <form>
            <select
              name="mall"
              defaultValue={String(mallId ?? "")}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-brand-600"
            >
              {mallList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-brand-800 ring-1 ring-brand-300"
            >
              Show rewards
            </button>
          </form>
        </label>
      </div>

      {issued.length > 0 ? (
        <Section title="My codes">
          <div className="space-y-3">
            {issued.map((redemption) => (
              <Card key={redemption.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900">
                    {rewardTitle.get(redemption.reward_id) ?? "Reward"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {dayLabel(redemption.created_at)}
                  </span>
                </div>
                <div className="mt-3">
                  <CodeQR code={redemption.code} />
                </div>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      {limited.length > 0 ? (
        <Section title="Limited time">
          <div className="space-y-3">
            {limited.map((reward) => (
              <RewardCard key={reward.id} reward={reward} balance={balance} />
            ))}
          </div>
        </Section>
      ) : null}

      {offers.length > 0 ? (
        <Section title={`Shop offers at ${mallName}`}>
          <div className="space-y-3">
            {offers.map((offer) => (
              <Card key={offer.id} className="ring-amber-200">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">
                    {offer.title}
                  </span>
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {offer.perk}
                  </span>
                </div>
                {offer.shop_name ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                    <Store className="h-3.5 w-3.5" aria-hidden />
                    {offer.shop_name}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Everywhere in {mallName}
                  </p>
                )}
                {offer.description ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {offer.description}
                  </p>
                ) : null}
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  Until {dayLabel(offer.ends_at)}
                </p>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Available at every mall">
        {general.length > 0 ? (
          <div className="space-y-3">
            {general.map((reward) => (
              <RewardCard key={reward.id} reward={reward} balance={balance} />
            ))}
          </div>
        ) : (
          <Empty>No township-wide rewards right now.</Empty>
        )}
      </Section>

      <Section title={mallName ? `Only at ${mallName}` : "Mall rewards"}>
        {specific.length > 0 ? (
          <div className="space-y-3">
            {specific.map((reward) => (
              <RewardCard key={reward.id} reward={reward} balance={balance} />
            ))}
          </div>
        ) : (
          <Empty>
            Nothing unique to this mall yet.{" "}
            <Link href="/app/rewards" className="font-medium text-brand-700">
              Try another
            </Link>
            .
          </Empty>
        )}
      </Section>
    </main>
  );
}

function RewardCard({ reward, balance }: { reward: Reward; balance: number }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-slate-900">{reward.title}</span>
        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
          {num(reward.points_cost)} pts
        </span>
      </div>

      {reward.description ? (
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {reward.description}
        </p>
      ) : null}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>
          {reward.stock > 0 ? `${num(reward.stock)} left` : "Out of stock"}
        </span>
        {reward.scope === "general" ? (
          <span className="inline-flex items-center gap-1 text-brand-700">
            <Ticket className="h-3.5 w-3.5" aria-hidden />
            Every mall
          </span>
        ) : null}
        {reward.ends_at ? (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Until {dayLabel(reward.ends_at)}
          </span>
        ) : null}
      </div>

      <RedeemButton
        rewardId={reward.id}
        title={reward.title}
        disabled={balance < reward.points_cost || reward.stock <= 0}
      />
    </Card>
  );
}
