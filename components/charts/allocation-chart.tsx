"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { rm } from "@/lib/format";

export type AllocationSlice = { name: string; value: number; color: string };

/**
 * Where this resident's money sits, by pool. A donut reads better than a bar
 * here because the question is "what share of mine is in each", not "how much".
 */
export function AllocationChart({
  data,
  total,
}: {
  data: AllocationSlice[];
  total: number;
}) {
  return (
    <div className="relative h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={82}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) =>
              [rm(Number(value)), String(name)] as [string, string]
            }
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Centre label — the total the ring adds up to. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-slate-500">Invested</span>
        <span className="tabular text-lg font-semibold text-brand-800">
          {rm(total)}
        </span>
      </div>
    </div>
  );
}
