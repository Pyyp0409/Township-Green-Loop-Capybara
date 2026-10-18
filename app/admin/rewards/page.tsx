import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Section } from "@/components/ui";
import { RoleShell } from "@/app/role-shell";
import { num } from "@/lib/format";
import { toggleReward } from "../actions";
import { RewardForm } from "./reward-form";

export const metadata = { title: "Rewards · Admin" };

export default async function AdminRewardsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fadmin%2Frewards");

  const supabase = await createClient();
  const [{ data: rewards }, { data: malls }] = await Promise.all([
    // The rewards policy lets an admin see inactive ones too.
    supabase
      .from("rewards")
      .select("id, mall_id, title, points_cost, stock, active")
      .order("mall_id")
      .order("points_cost"),
    supabase.from("malls").select("id, name").order("name"),
  ]);

  const mallName = new Map(
    (malls ?? []).map((m) => [m.id as number, m.name as string]),
  );

  return (
    <RoleShell profile={profile} area="Developer admin">
      <Link
        href="/admin"
        className="mt-5 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Overview
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">Rewards</h1>

      <Section title="Catalogue">
        {(rewards ?? []).length > 0 ? (
          <div className="space-y-3">
            {(rewards ?? []).map((reward) => (
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
                  {mallName.get(reward.mall_id) ?? "Mall"} · {num(reward.stock)} in
                  stock · {reward.active ? "visible" : "hidden"}
                </p>
                <form action={toggleReward} className="mt-3">
                  <input type="hidden" name="reward_id" value={reward.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={String(reward.active)}
                  />
                  <button
                    type="submit"
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300"
                  >
                    {reward.active ? "Hide from residents" : "Show to residents"}
                  </button>
                </form>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>No rewards yet.</Empty>
        )}
      </Section>

      <Section title="Add a reward">
        <RewardForm malls={(malls ?? []) as { id: number; name: string }[]} />
      </Section>
    </RoleShell>
  );
}
