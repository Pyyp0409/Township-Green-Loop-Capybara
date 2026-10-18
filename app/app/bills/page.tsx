import { createClient } from "@/lib/supabase/server";
import { Card, Empty, Section, Stat } from "@/components/ui";
import { KwhChart, type KwhPoint } from "@/components/charts/kwh-chart";
import { monthLabel, num, rm } from "@/lib/format";
import { BillForm } from "./bill-form";

export const metadata = { title: "Bills" };

export default async function BillsPage() {
  const supabase = await createClient();
  const { data: bills } = await supabase
    .from("energy_bills")
    .select("id, bill_month, kwh, amount_rm")
    .order("bill_month", { ascending: true });

  const rows = bills ?? [];
  const chartData: KwhPoint[] = rows.map((bill) => ({
    month: monthLabel(bill.bill_month),
    kwh: Number(bill.kwh),
  }));

  const latest = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const change =
    latest && previous && Number(previous.kwh) > 0
      ? (Number(latest.kwh) / Number(previous.kwh) - 1) * 100
      : null;

  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Electricity bills</h1>
      <p className="mt-1 text-sm text-slate-600">
        Add each month&apos;s bill. Use at least 10% less than the month before and
        points are added automatically.
      </p>

      {latest ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat
            label={`Latest (${monthLabel(latest.bill_month)})`}
            value={`${num(latest.kwh)} kWh`}
            hint={rm(latest.amount_rm)}
          />
          <Stat
            label="Vs month before"
            value={
              change === null
                ? "—"
                : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`
            }
            hint={
              change !== null && change <= -10
                ? "Earned energy-saving points"
                : "10% less earns points"
            }
          />
        </div>
      ) : null}

      <Section title="Add a bill">
        <BillForm />
      </Section>

      {chartData.length > 0 ? (
        <Section title="Your kWh trend">
          <Card>
            <KwhChart data={chartData} />
          </Card>
        </Section>
      ) : null}

      <Section title="All bills">
        {rows.length > 0 ? (
          <Card className="divide-y divide-slate-100 p-0">
            {[...rows].reverse().map((bill) => (
              <div
                key={bill.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {monthLabel(bill.bill_month)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {num(bill.kwh)} kWh
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {rm(bill.amount_rm)}
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <Empty>No bills yet. Add your first one above.</Empty>
        )}
      </Section>
    </main>
  );
}
