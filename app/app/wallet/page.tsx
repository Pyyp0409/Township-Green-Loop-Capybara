import { createClient } from "@/lib/supabase/server";
import { Card, Empty, Section, Stat } from "@/components/ui";
import { CodeQR } from "@/components/qr";
import { dayLabel, rm } from "@/lib/format";
import { SpendForm } from "./spend-form";
import { ConvertForm, PayoutPreferenceForm } from "./money-out";
import { PAY_METHOD_LABEL } from "@/lib/payments";

export const metadata = { title: "Wallet" };

const KIND_LABEL: Record<string, string> = {
  payout: "Payout",
  mall_spend: "Mall credit",
  withdrawal: "Withdrawal",
  points_conversion: "Turned into points",
  top_up: "Top up",
};

export default async function WalletPage() {
  const supabase = await createClient();

  const [
    { data: balance },
    { data: transactions },
    { data: malls },
    { data: credits },
    { data: pref },
  ] = await Promise.all([
      supabase.rpc("my_wallet"),
      supabase
        .from("wallet_transactions")
        .select("id, amount, kind, note, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("malls").select("id, name").order("name"),
      supabase
        .from("mall_credits")
        .select("id, mall_id, wallet_amount, bonus, value, code, status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("payout_preferences")
        .select("method, account_ref")
        .maybeSingle(),
    ]);

  const mallName = new Map(
    (malls ?? []).map((m) => [m.id as number, m.name as string]),
  );
  const issued = (credits ?? []).filter((c) => c.status === "issued");

  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Wallet</h1>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Balance" value={rm(balance ?? 0)} />
        <Stat
          label="Unused mall credits"
          value={rm(issued.reduce((sum, c) => sum + Number(c.value), 0))}
          hint={
            pref?.method
              ? `Paid by ${PAY_METHOD_LABEL[pref.method as string] ?? pref.method}`
              : undefined
          }
        />
      </div>

      <Section title="Spend at a mall">
        <SpendForm
          malls={(malls ?? []) as { id: number; name: string }[]}
          balance={Number(balance ?? 0)}
        />
      </Section>

      <Section title="Turn money into points">
        <ConvertForm balance={Number(balance ?? 0)} />
      </Section>

      <Section title="How you get paid">
        <PayoutPreferenceForm
          method={(pref?.method as string) ?? "bank_transfer"}
          accountRef={(pref?.account_ref as string | null) ?? null}
        />
      </Section>

      <Section title="My mall credits">
        {issued.length > 0 ? (
          <div className="space-y-3">
            {issued.map((credit) => (
              <Card key={credit.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900">
                    {mallName.get(credit.mall_id) ?? "Mall"}
                  </span>
                  <span className="font-semibold text-brand-800">
                    {rm(credit.value)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {rm(credit.wallet_amount)} from wallet + {rm(credit.bonus)} bonus ·{" "}
                  {dayLabel(credit.created_at)}
                </p>
                <div className="mt-3">
                  <CodeQR code={credit.code} />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>
            No unused credits. Turn wallet money into a mall credit above and it gains
            10%.
          </Empty>
        )}
      </Section>

      <Section title="Transactions">
        {(transactions ?? []).length > 0 ? (
          <Card className="divide-y divide-slate-100 p-0">
            {(transactions ?? []).map((tx) => {
              const amount = Number(tx.amount);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900">
                      {KIND_LABEL[tx.kind] ?? tx.kind}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {tx.note ?? dayLabel(tx.created_at)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      amount >= 0 ? "text-brand-800" : "text-slate-600"
                    }`}
                  >
                    {amount >= 0 ? "+" : "−"}
                    {rm(Math.abs(amount))}
                  </span>
                </div>
              );
            })}
          </Card>
        ) : (
          <Empty>No wallet activity yet.</Empty>
        )}
      </Section>

    </main>
  );
}
