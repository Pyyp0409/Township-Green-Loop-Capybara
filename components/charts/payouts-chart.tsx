"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { rm } from "@/lib/format";

export type PayoutPoint = { month: string; cumulative: number };

export function PayoutsChart({ data }: { data: PayoutPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="payoutFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#215D4A" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#215D4A" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => `RM${v.toLocaleString("en-MY")}`}
          />
          <Tooltip
            formatter={(value) => [rm(Number(value)), "Paid to date"] as [string, string]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#215D4A"
            strokeWidth={2}
            fill="url(#payoutFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
