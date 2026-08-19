import type { SensitivityGrid as Grid } from "@/lib/dcf";
import { fmtPrice } from "@/lib/dcf";

export function SensitivityGrid({ grid, price }: { grid: Grid; price: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              {grid.rowTitle} \ {grid.colTitle}
            </th>
            {grid.colLabels.map((c) => (
              <th key={c} className="num px-2 py-1.5 text-right text-[11px] text-muted-foreground">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.values.map((row, ri) => (
            <tr key={grid.rowLabels[ri]}>
              <th className="num px-2 py-1.5 text-left text-[11px] font-medium text-muted-foreground">
                {grid.rowLabels[ri]}
              </th>
              {row.map((val, ci) => {
                const upside = price > 0 && Number.isFinite(val) ? val / price - 1 : Number.NaN;
                const intensity = Number.isFinite(upside)
                  ? Math.min(Math.abs(upside) / 0.5, 1) * 0.35 + 0.06
                  : 0;
                const token = upside >= 0 ? "var(--positive)" : "var(--negative)";
                return (
                  <td
                    key={ci}
                    className="num px-2 py-1.5 text-right text-[11px] text-foreground"
                    style={{
                      backgroundColor: Number.isFinite(upside)
                        ? `color-mix(in oklab, ${token} ${(intensity * 100).toFixed(0)}%, transparent)`
                        : "transparent",
                    }}
                    title={Number.isFinite(upside) ? `${(upside * 100).toFixed(0)}% vs price` : "n/a"}
                  >
                    {fmtPrice(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Intrinsic value per share. Green = above the current market price, red = below.
      </p>
    </div>
  );
}
