import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, XCircle } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Section } from "@/components/ui";
import { RoleShell } from "@/app/role-shell";
import { dayLabel } from "@/lib/format";
import { respondToPromotion } from "../actions";

export const metadata = { title: "Offers" };

const STATUS = {
  proposed: { label: "Waiting for you", Icon: Clock, tone: "text-amber-700" },
  accepted: { label: "Accepted", Icon: CheckCircle2, tone: "text-brand-700" },
  live: { label: "Running now", Icon: CheckCircle2, tone: "text-brand-700" },
  declined: { label: "Declined", Icon: XCircle, tone: "text-slate-500" },
  ended: { label: "Ended", Icon: XCircle, tone: "text-slate-400" },
} as const;

export default async function ShopPromotionsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fshop%2Fpromotions");

  const supabase = await createClient();
  // RLS only returns proposals aimed at this merchant's shop or mall.
  const { data: promotions } = await supabase
    .from("promotions")
    .select(
      "id, title, perk, description, starts_at, ends_at, status, response_note, shop_id",
    )
    .order("created_at", { ascending: false });

  const rows = promotions ?? [];
  const waiting = rows.filter((p) => p.status === "proposed");
  const settled = rows.filter((p) => p.status !== "proposed");

  return (
    <RoleShell profile={profile} area="Merchant">
      <Link
        href="/shop"
        className="mt-5 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        My shop
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">Offers</h1>
      <p className="mt-1 text-sm text-slate-600">
        The township team proposes offers. Nothing runs in your shop until you
        agree to it.
      </p>

      <Section title={`Waiting for your answer (${waiting.length})`}>
        {waiting.length > 0 ? (
          <div className="space-y-3">
            {waiting.map((promo) => (
              <Card key={promo.id} className="ring-amber-200">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">
                    {promo.title}
                  </span>
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {promo.perk}
                  </span>
                </div>

                {promo.description ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {promo.description}
                  </p>
                ) : null}

                <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {dayLabel(promo.starts_at)} to {dayLabel(promo.ends_at)}
                </p>

                {promo.shop_id === null ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Sent to every shop in your mall.
                  </p>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <form action={respondToPromotion} className="flex-1">
                    <input type="hidden" name="promotion_id" value={promo.id} />
                    <input type="hidden" name="accept" value="true" />
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white"
                    >
                      Accept
                    </button>
                  </form>
                  <form action={respondToPromotion} className="flex-1">
                    <input type="hidden" name="promotion_id" value={promo.id} />
                    <input type="hidden" name="accept" value="false" />
                    <input
                      type="hidden"
                      name="note"
                      value="Not a good fit for us this time."
                    />
                    <button
                      type="submit"
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>Nothing waiting. You have answered every proposal.</Empty>
        )}
      </Section>

      <Section title="Past and current offers">
        {settled.length > 0 ? (
          <div className="space-y-3">
            {settled.map((promo) => {
              const meta = STATUS[promo.status as keyof typeof STATUS] ?? STATUS.ended;
              return (
                <Card key={promo.id}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900">
                      {promo.title}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${meta.tone}`}
                    >
                      <meta.Icon className="h-3.5 w-3.5" aria-hidden />
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {promo.perk} · {dayLabel(promo.starts_at)} to{" "}
                    {dayLabel(promo.ends_at)}
                  </p>
                  {promo.response_note ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Your note: {promo.response_note}
                    </p>
                  ) : null}
                </Card>
              );
            })}
          </div>
        ) : (
          <Empty>No offers have run in your shop yet.</Empty>
        )}
      </Section>
    </RoleShell>
  );
}
