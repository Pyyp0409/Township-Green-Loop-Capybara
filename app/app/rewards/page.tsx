import { createClient } from "@/lib/supabase/server";
import { Card, Empty, Section, Stat } from "@/components/ui";
import { CodeQR } from "@/components/qr";
import { dayLabel, num } from "@/lib/format";
import { RedeemButton } from "./redeem-button";

export const metadata = { title: "Rewards" };

export default async function RewardsPage() {
  const supabase = await createClient();

  const [{ data: points }, { data: rewards }, { data: malls }, { data: redemptions }] =
    await Promise.all([
      supabase.rpc("my_points"),
      supabase
        .from("rewards")
        .select("id, mall_id, title, points_cost, stock, active")
        .eq("active", true)
        .order("points_cost", { ascending: true }),
      supabase.from("malls").select("id, name").order("name"),
      supabase
        .from("redemptions")
        .select("id, reward_id, points_used, code, status, created_at")
        .order("created_at", { ascending: false }),
    ]);

  const balance = Number(points ?? 0);
  const rewardTitle = new Map(
    (rewards ?? []).map((r) => [r.id as number, r.title as string]),
  );
  const issued = (redemptions ?? []).filter((r) => r.status === "issued");

  // Group the catalogue by mall.
  const byMall = new Map<number, typeof rewards>();
  for (const reward of rewards ?? []) {
    const list = byMall.get(reward.mall_id) ?? [];
    list.push(reward);
    byMall.set(reward.mall_id, list);
  }

  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Rewards</h1>

      <div className="mt-5">
        <Stat label="Your points" value={num(balance)} />
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

      {(malls ?? []).map((mall) => {
        const list = byMall.get(mall.id);
        if (!list || list.length === 0) return null;
        return (
          <Section key={mall.id} title={mall.name}>
            <div className="space-y-3">
              {list.map((reward) => (
                <Card key={reward.id}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900">
                      {reward.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {num(reward.points_cost)} pts
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {reward.stock > 0 ? `${num(reward.stock)} left` : "Out of stock"}
                  </p>
                  <RedeemButton
                    rewardId={reward.id}
                    title={reward.title}
                    disabled={balance < reward.points_cost || reward.stock <= 0}
                  />
                </Card>
              ))}
            </div>
          </Section>
        );
      })}

      {(rewards ?? []).length === 0 ? (
        <Section title="Catalogue">
          <Empty>No rewards available right now.</Empty>
        </Section>
      ) : null}
    </main>
  );
}
