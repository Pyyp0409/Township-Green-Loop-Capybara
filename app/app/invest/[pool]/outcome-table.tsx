"use client";

import { rm } from "@/lib/format";
import type { PoolPlan } from "@/lib/plan";

/**
 * What the resident actually walks away with, in both the plan's normal case
 * and its conservative stress test. Shown live against the amount they typed.
 */
export function OutcomeTable({
  amount,
  plan,
  poolId,
}: {
  amount: number;
  plan: PoolPlan;
  poolId: string;
}) {
  const safe = Number.isFinite(amount) && amount > 0 ? amount : 0;

  const rows = [
    { label: "If things go to plan", info: plan.normal, tone: "good" as const },
    {
      label: "If things go badly",
      info: plan.conservative,
      tone: "bad" as const,
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
      <table className="w-full text-sm">
        <caption className="sr-only">
          What you get back over the whole payback period
        </caption>
        <thead>
          <tr className="bg-slate-50 text-left text-xs text-slate-500">
            <th scope="col" className="px-3 py-2 font-medium">
              Over {plan.paybackLabel.split(",")[0]}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              You get back
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Gain
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => {
            const back = safe * row.info.total;
            const gain = back - safe;
            const losing = gain < 0;
            return (
              <tr key={row.label}>
                <th
                  scope="row"
                  className="px-3 py-2.5 text-left font-normal text-slate-600"
                >
                  {row.label}
                </th>
                <td className="tabular px-3 py-2.5 text-right font-medium text-slate-900">
                  {rm(back)}
                </td>
                <td
                  className={`tabular px-3 py-2.5 text-right font-semibold ${
                    losing ? "text-rose-700" : "text-brand-700"
                  }`}
                >
                  {losing ? "−" : "+"}
                  {rm(Math.abs(gain))}
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    {losing ? "−" : "+"}
                    {Math.abs((row.info.total - 1) * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
        {plan.conservativeNote}
        {poolId === "ev"
          ? " In a severe case you can lose most of your money."
          : ""}
      </p>
    </div>
  );
}
