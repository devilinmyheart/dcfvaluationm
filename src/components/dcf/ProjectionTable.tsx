import type { Valuation } from "@/lib/dcf";
import { fmtMoney, fmtPct } from "@/lib/dcf";

export function ProjectionTable({ v, currency }: { v: Valuation; currency: string }) {
  const rows: { label: string; get: (i: number) => string }[] = [
    { label: "Revenue growth", get: (i) => fmtPct(v.rows[i]!.growth) },
    { label: "Revenue", get: (i) => fmtMoney(v.rows[i]!.revenue, currency) },
    { label: "EBIT", get: (i) => fmtMoney(v.rows[i]!.ebit, currency) },
    { label: "NOPAT", get: (i) => fmtMoney(v.rows[i]!.nopat, currency) },
    { label: "+ D&A", get: (i) => fmtMoney(v.rows[i]!.da, currency) },
    { label: "− Capex", get: (i) => fmtMoney(-v.rows[i]!.capex, currency) },
    { label: "− Δ NWC", get: (i) => fmtMoney(-v.rows[i]!.changeNwc, currency) },
    { label: "Unlevered FCF", get: (i) => fmtMoney(v.rows[i]!.fcf, currency) },
    { label: "Discount factor", get: (i) => v.rows[i]!.discountFactor.toFixed(3) },
    { label: "PV of FCF", get: (i) => fmtMoney(v.rows[i]!.pv, currency) },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Line item
            </th>
            {v.rows.map((r) => (
              <th key={r.year} className="num px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                {r.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const emphasis = row.label === "Unlevered FCF" || row.label === "PV of FCF";
            return (
              <tr
                key={row.label}
                className={`border-b border-border/60 ${emphasis ? "bg-secondary/40" : ri % 2 ? "bg-surface/40" : ""}`}
              >
                <td
                  className={`px-3 py-1.5 text-left text-xs ${emphasis ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                >
                  {row.label}
                </td>
                {v.rows.map((r, i) => (
                  <td
                    key={r.year}
                    className={`num px-3 py-1.5 text-right text-xs ${emphasis ? "font-semibold text-foreground" : "text-foreground/85"}`}
                  >
                    {row.get(i)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
