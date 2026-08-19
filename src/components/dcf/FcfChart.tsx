import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Valuation } from "@/lib/dcf";
import { fmtMoney } from "@/lib/dcf";

export function FcfChart({ v, currency }: { v: Valuation; currency: string }) {
  const data = v.rows.map((r) => ({ year: String(r.year), fcf: r.fcf, pv: r.pv }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val: number) => fmtMoney(val, currency)}
            width={70}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
            formatter={(val: number, name: string) => [fmtMoney(val, currency), name === "fcf" ? "Unlevered FCF" : "PV of FCF"]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
            formatter={(name) => (name === "fcf" ? "Unlevered FCF" : "PV of FCF")}
          />
          <Bar dataKey="fcf" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="pv" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
