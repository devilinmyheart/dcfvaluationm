import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Valuation } from "@/lib/dcf";
import { fmtMoney, fmtPct } from "@/lib/dcf";

const LABELS: Record<string, string> = {
  revenue: "Revenue",
  ebitda: "EBITDA",
  margin: "EBITDA margin",
};

export function RevenueEbitdaChart({ v, currency }: { v: Valuation; currency: string }) {
  const data = v.rows.map((r) => ({
    year: String(r.year),
    revenue: r.revenue,
    ebitda: r.ebitda,
    margin: r.revenue ? r.ebitda / r.revenue : 0,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="left"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val: number) => fmtMoney(val, currency)}
            width={70}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val: number) => fmtPct(val, 0)}
            width={46}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
            formatter={(val: number, name: string) => [
              name === "margin" ? fmtPct(val) : fmtMoney(val, currency),
              LABELS[name] ?? name,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(name) => LABELS[String(name)] ?? name} />
          <Area
            yAxisId="left"
            dataKey="revenue"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Line yAxisId="left" dataKey="ebitda" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
          <Line
            yAxisId="right"
            dataKey="margin"
            stroke="var(--chart-4)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
