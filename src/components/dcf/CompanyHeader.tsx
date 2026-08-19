import type { CompanyFinancials } from "@/lib/dcf";
import { fmtMoney, fmtPrice } from "@/lib/dcf";

export function CompanyHeader({ f }: { f: CompanyFinancials }) {
  const latest = f.history[f.history.length - 1];
  const items = [
    { label: "Price", value: fmtPrice(f.price) },
    { label: "Market cap", value: fmtMoney(f.marketCap) },
    { label: "Beta", value: f.beta.toFixed(2) },
    { label: "Net debt", value: fmtMoney(f.totalDebt - f.cash) },
    { label: `Revenue FY${latest?.year ?? ""}`, value: fmtMoney(latest?.revenue ?? 0) },
    { label: "Trailing FCF", value: fmtMoney(latest?.freeCashFlow ?? 0) },
    { label: "Diluted shares", value: fmtMoney(f.sharesOutstanding, "") },
  ];

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <span className="num rounded bg-primary/15 px-2 py-0.5 text-sm font-semibold text-primary">
          {f.symbol}
        </span>
        <h1 className="text-lg font-semibold text-foreground">{f.name}</h1>
        <span className="text-xs text-muted-foreground">
          {f.exchange} · {f.currency}
        </span>
      </div>
      <dl className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 lg:grid-cols-7 lg:divide-y-0">
        {items.map((i) => (
          <div key={i.label} className="px-4 py-3">
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{i.label}</dt>
            <dd className="num mt-0.5 text-sm text-foreground">{i.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
