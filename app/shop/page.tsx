import { redirect } from "next/navigation";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Section, Stat } from "@/components/ui";
import { SavingChart, type SavingPoint } from "@/components/charts/saving-chart";
import { RoleShell } from "@/app/role-shell";
import Link from "next/link";
import { ChevronRight, Tag, Users } from "lucide-react";
import { dayLabel, monthLabel, num, rm } from "@/lib/format";
import { AcceptForm } from "./accept-form";

export const metadata = { title: "Merchant" };

export default async function MerchantHome() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fshop");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS already limits shops to this merchant; the filter keeps the query honest.
  const { data: shops } = await supabase
    .from("shops")
    .select("id, name, category, upgraded, mall_id")
    .eq("merchant_id", user?.id ?? "");

  const shop = shops?.[0];

  const [{ data: energy }, { data: credits }] = await Promise.all([
    shop
      ? supabase
          .from("shop_energy")
          .select("id, month, kwh, baseline_kwh, bill_rm, saving_rm")
          .eq("shop_id", shop.id)
          .order("month", { ascending: true })
      : Promise.resolve({ data: null }),
    supabase
      .from("mall_credits")
      .select("id, value, code, status, created_at")
      .eq("status", "used")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const rows = energy ?? [];
  const chartData: SavingPoint[] = rows.map((row) => ({
    month: monthLabel(row.month),
    kwh: Number(row.kwh),
    baseline: Number(row.baseline_kwh),
  }));

  const totalSaved = rows.reduce((sum, row) => sum + Number(row.saving_rm), 0);
  const latest = rows[rows.length - 1];
  const cutPercent =
    latest && Number(latest.baseline_kwh) > 0
      ? (1 - Number(latest.kwh) / Number(latest.baseline_kwh)) * 100
      : null;

  return (
    <RoleShell profile={profile} area="Merchant">
      <h1 className="mt-5 text-2xl font-bold text-slate-900">
        {shop?.name ?? "Your shop"}
      </h1>
      {shop ? (
        <p className="mt-1 text-sm text-slate-500">
          {shop.category}
          {shop.upgraded ? " · energy upgrade installed" : ""}
        </p>
      ) : null}

      <Section title="Shortcuts">
        <div className="space-y-3">
          <Link href="/shop/promotions" className="block">
            <Card className="flex items-center gap-3">
              <Tag className="h-5 w-5 shrink-0 text-brand-700" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">
                  Offers
                </span>
                <span className="block text-xs text-slate-500">
                  Accept or decline what the township proposes
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </Card>
          </Link>
          <Link href="/community" className="block">
            <Card className="flex items-center gap-3">
              <Users className="h-5 w-5 shrink-0 text-brand-700" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">
                  Community
                </span>
                <span className="block text-xs text-slate-500">
                  Talk to residents and the township team
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </Card>
          </Link>
        </div>
      </Section>

      <Section title="Accept a code">
        <AcceptForm />
      </Section>

      {shop?.upgraded ? (
        <>
          <Section title="Energy saving">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Saved so far" value={rm(totalSaved)} />
              <Stat
                label="Latest month vs baseline"
                value={cutPercent === null ? "—" : `−${cutPercent.toFixed(1)}%`}
                hint={latest ? monthLabel(latest.month) : undefined}
              />
            </div>
          </Section>

          {chartData.length > 0 ? (
            <Section title="kWh vs baseline">
              <Card>
                <SavingChart data={chartData} />
              </Card>
            </Section>
          ) : null}

          <Section title="Monthly detail">
            <Card className="divide-y divide-slate-100 p-0">
              {[...rows].reverse().map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {monthLabel(row.month)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {num(row.kwh)} kWh vs {num(row.baseline_kwh)} baseline
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-brand-800">
                    {rm(row.saving_rm)} saved
                  </span>
                </div>
              ))}
            </Card>
          </Section>
        </>
      ) : (
        <Section title="Energy saving">
          <Empty>
            This shop has not had an energy upgrade yet. Once it does, the kWh and
            savings dashboard appears here.
          </Empty>
        </Section>
      )}

      <Section title="Recently accepted credits">
        {(credits ?? []).length > 0 ? (
          <Card className="divide-y divide-slate-100 p-0">
            {(credits ?? []).map((credit) => (
              <div
                key={credit.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <code className="text-sm font-medium tracking-widest text-slate-900">
                    {credit.code}
                  </code>
                  <div className="text-xs text-slate-500">
                    {dayLabel(credit.created_at)}
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {rm(credit.value)}
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <Empty>No codes accepted yet.</Empty>
        )}
      </Section>
    </RoleShell>
  );
}
