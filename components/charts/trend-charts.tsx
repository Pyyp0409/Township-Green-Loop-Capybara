"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { num, rm } from "@/lib/format";

export type TrendPoint = {
  label: string;
  new_investments: number;
  new_investors: number;
  raised: number;
  raised_solar: number;
  raised_upgrade: number;
  raised_ev: number;
  cumulative_raised: number;
  paid_out: number;
  points_issued: number;
  new_members: number;
  raised_residents: number;
  raised_supporters: number;
};

const AXIS = {
  tick: { fontSize: 11, fill: "#64748b" },
  tickLine: false,
  axisLine: false,
} as const;

const TOOLTIP = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontSize: 12,
} as const;

const money = (v: number) => `RM${Number(v).toLocaleString("en-MY")}`;

/** Money raised each month, with the running total climbing behind it. */
export function RaisedTrend({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#215D4A" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#215D4A" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} width={64} tickFormatter={money} />
          <Tooltip
            formatter={(value, name) =>
              [rm(Number(value)), String(name)] as [string, string]
            }
            contentStyle={TOOLTIP}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="cumulative_raised"
            name="Raised to date"
            stroke="#215D4A"
            strokeWidth={2}
            fill="url(#cumFill)"
          />
          <Area
            type="monotone"
            dataKey="raised"
            name="New this month"
            stroke="#99C5B5"
            strokeWidth={2}
            fill="transparent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** How much went into each pool, month by month. */
export function PoolsTrend({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} width={64} tickFormatter={money} />
          <Tooltip
            formatter={(value, name) =>
              [rm(Number(value)), String(name)] as [string, string]
            }
            contentStyle={TOOLTIP}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="raised_solar" name="Solar" stackId="p" fill="#215D4A" />
          <Bar dataKey="raised_upgrade" name="Upgrades" stackId="p" fill="#4A917C" />
          <Bar
            dataKey="raised_ev"
            name="EV"
            stackId="p"
            fill="#99C5B5"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** New investors and new members each month. */
export function InvestorTrend({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} width={44} allowDecimals={false} />
          <Tooltip
            formatter={(value, name) =>
              [num(Number(value)), String(name)] as [string, string]
            }
            contentStyle={TOOLTIP}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="new_investors"
            name="Investors"
            stroke="#215D4A"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="new_members"
            name="New members"
            stroke="#4A917C"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="new_investments"
            name="Investments made"
            stroke="#99C5B5"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Residents vs supporters, so the 70% rule can be watched over time. */
export function MembershipTrend({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} width={64} tickFormatter={money} />
          <Tooltip
            formatter={(value, name) =>
              [rm(Number(value)), String(name)] as [string, string]
            }
            contentStyle={TOOLTIP}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="raised_residents"
            name="Residents"
            stackId="m"
            fill="#215D4A"
          />
          <Bar
            dataKey="raised_supporters"
            name="Supporters"
            stackId="m"
            fill="#C9A8E8"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Payouts leaving and points being issued. */
export function RewardTrend({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis
            yAxisId="rm"
            {...AXIS}
            width={60}
            tickFormatter={(v: number) => `RM${v}`}
          />
          <YAxis yAxisId="pts" orientation="right" {...AXIS} width={52} />
          <Tooltip
            formatter={(value, name) =>
              [
                String(name) === "Paid out"
                  ? rm(Number(value))
                  : `${num(Number(value))} pts`,
                String(name),
              ] as [string, string]
            }
            contentStyle={TOOLTIP}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="rm"
            type="monotone"
            dataKey="paid_out"
            name="Paid out"
            stroke="#215D4A"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="pts"
            type="monotone"
            dataKey="points_issued"
            name="Points issued"
            stroke="#E0A23C"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
