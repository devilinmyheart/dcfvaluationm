import type { Valuation } from "@/lib/dcf";
import { fmtMoney, fmtPct, fmtPrice } from "@/lib/dcf";

export function ValuationSummary({
  v,
  price,
  currency,
  netDebt,
  shares,
}: {
  v: Valuation;
  price: number;
  currency: string;
  netDebt: number;
  shares: number;
}) {
  const upside = price > 0 ? v.intrinsicPerShare / price - 1 : Number.NaN;
  const verdict = !Number.isFinite(upside)
    ? { label: "Not computable", tone: "text-muted-foreground" }
    : upside > 0.15
      ? { label: "Undervalued", tone: "text-positive" }
      : upside < -0.15
        ? { label: "Overvalued", tone: "text-negative" }
        : { label: "Fairly valued", tone: "text-primary" };

  const bridge = [
    { label: "PV of forecast FCF", value: fmtMoney(v.pvOfFcf, currency) },
    { label: "PV of terminal value", value: fmtMoney(v.pvOfTerminal, currency) },
    { label: "Enterprise value", value: fmtMoney(v.enterpriseValue, currency), strong: true },
    { label: "− Net debt", value: fmtMoney(-netDebt, currency) },
    { label: "Equity value", value: fmtMoney(v.equityValue, currency), strong: true },
    { label: "÷ Diluted shares", value: fmtMoney(shares, "") },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Intrinsic value per share</p>
        <p className="num mt-1 text-4xl font-semibold text-foreground">{fmtPrice(v.intrinsicPerShare, currency === "USD" ? "$" : "")}</p>
        <div className="mt-3 flex items-baseline gap-3 text-sm">
          <span className="text-muted-foreground">Market {fmtPrice(price)}</span>
          <span className={`num font-semibold ${upside >= 0 ? "text-positive" : "text-negative"}`}>
            {Number.isFinite(upside) ? `${upside >= 0 ? "+" : ""}${fmtPct(upside)}` : "n/a"}
          </span>
        </div>
        <p className={`mt-3 inline-block rounded border border-border px-2 py-1 text-xs font-semibold ${verdict.tone}`}>
          {verdict.label}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <h2 className="border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Enterprise → equity bridge
        </h2>
        <dl className="divide-y divide-border/60">
          {bridge.map((b) => (
            <div key={b.label} className="flex items-center justify-between px-4 py-2">
              <dt className={`text-xs ${b.strong ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{b.label}</dt>
              <dd className={`num text-xs ${b.strong ? "font-semibold text-foreground" : "text-foreground/85"}`}>{b.value}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          WACC <span className="num text-foreground">{fmtPct(v.wacc, 2)}</span> · terminal value is{" "}
          <span className="num text-foreground">{fmtPct(v.terminalShare, 0)}</span> of EV
        </div>
      </div>
    </div>
  );
}
