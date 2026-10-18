"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type RatingPoint = { area: string; rating: number; responses: number };

/** Red below 3, amber at 3, teal above — so the weak areas stand out. */
function toneFor(rating: number) {
  if (rating < 3) return "#E05B5B";
  if (rating < 4) return "#E0A23C";
  return "#215D4A";
}

export function RatingChart({ data }: { data: RatingPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="area"
            width={96}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value, _name, item) =>
              [
                `${Number(value).toFixed(2)} of 5 · ${
                  (item?.payload as RatingPoint)?.responses ?? 0
                } replies`,
                "Average",
              ] as [string, string]
            }
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Bar dataKey="rating" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((entry) => (
              <Cell key={entry.area} fill={toneFor(entry.rating)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
