import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Store, XCircle } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Section, Stat } from "@/components/ui";
import { RoleShell } from "@/app/role-shell";
import { dayLabel, num } from "@/lib/format";
import { PromotionForm, type ShopOption } from "./promotion-form";

export const metadata = { title: "Promotions · Admin" };

const STATUS = {
  proposed: { label: "Waiting for the shop", Icon: Clock, tone: "text-amber-700" },
  accepted: { label: "Accepted", Icon: CheckCircle2, tone: "text-brand-700" },
  live: { label: "Running now", Icon: CheckCircle2, tone: "text-brand-700" },
  declined: { label: "Declined", Icon: XCircle, tone: "text-rose-700" },
  ended: { label: "Ended", Icon: XCircle, tone: "text-slate-400" },
} as const;

export default async function AdminPromotionsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fadmin%2Fpromotions");

  const supabase = await createClient();

  // Move anything whose dates have arrived or passed before we read the list.
  await supabase.rpc("refresh_promotion_status");

  const [{ data: promotions }, { data: malls }, { data: shops }] = await Promise.all([
    supabase
      .from("promotions")
      .select(
        "id, mall_id, shop_id, title, perk, description, starts_at, ends_at, status, response_note, responded_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("malls").select("id, name").order("name"),
    supabase.from("shops").select("id, name, mall_id").order("name"),
  ]);

  const rows = promotions ?? [];
  const mallName = new Map((malls ?? []).map((m) => [m.id as number, m.name as string]));
  const shopName = new Map((shops ?? []).map((s) => [s.id as number, s.name as string]));

  const waiting = rows.filter((p) => p.status === "proposed");
  const live = rows.filter((p) => p.status === "live" || p.status === "accepted");
  const closed = rows.filter((p) => p.status === "declined" || p.status === "ended");

  return (
    <RoleShell profile={profile} area="Developer admin">
      <Link
        href="/admin"
        className="mt-5 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Overview
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">Promotions</h1>
      <p className="mt-1 text-sm text-slate-600">
        You propose, the shop agrees. Nothing reaches residents until the shop
        has said yes.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Waiting" value={num(waiting.length)} />
        <Stat label="Running" value={num(live.length)} />
        <Stat label="Closed" value={num(closed.length)} />
      </div>

      <Section title="Propose a new offer">
        <PromotionForm
          malls={(malls ?? []) as { id: number; name: string }[]}
          shops={(shops ?? []) as ShopOption[]}
        />
      </Section>

      {[
        { title: `Waiting for a shop (${waiting.length})`, list: waiting },
        { title: `Agreed and running (${live.length})`, list: live },
        { title: `Declined and ended (${closed.length})`, list: closed },
      ].map((group) => (
        <Section key={group.title} title={group.title}>
          {group.list.length > 0 ? (
            <div className="space-y-3">
              {group.list.map((promo) => {
                const meta = STATUS[promo.status as keyof typeof STATUS] ?? STATUS.ended;
                return (
                  <Card key={promo.id}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {promo.title}
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${meta.tone}`}
                      >
                        <meta.Icon className="h-3.5 w-3.5" aria-hidden />
                        {meta.label}
                      </span>
                    </div>

                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                      <Store className="h-3.5 w-3.5" aria-hidden />
                      {promo.shop_id
                        ? shopName.get(promo.shop_id) ?? "Shop"
                        : `Every shop in ${mallName.get(promo.mall_id) ?? "the mall"}`}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {promo.perk} · {dayLabel(promo.starts_at)} to{" "}
                      {dayLabel(promo.ends_at)}
                    </p>

                    {promo.response_note ? (
                      <p className="mt-1.5 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
                        Shop said: {promo.response_note}
                      </p>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Empty>Nothing here.</Empty>
          )}
        </Section>
      ))}
    </RoleShell>
  );
}
