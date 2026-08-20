import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { TickerSearch } from "@/components/dcf/TickerSearch";
import { CompanyHeader } from "@/components/dcf/CompanyHeader";
import { AssumptionsPanel } from "@/components/dcf/AssumptionsPanel";
import { ProjectionTable } from "@/components/dcf/ProjectionTable";
import { ValuationSummary } from "@/components/dcf/ValuationSummary";
import { SensitivityGrid } from "@/components/dcf/SensitivityGrid";
import { FcfChart } from "@/components/dcf/FcfChart";
import { Section } from "@/components/dcf/fields";
import { getCompanyFinancials } from "@/lib/marketdata.functions";
import { defaultAssumptions, sensitivity, valuate, type Assumptions } from "@/lib/dcf";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DCF Valuation Terminal — Intrinsic Value of Any Stock" },
      {
        name: "description",
        content:
          "Run a discounted cash flow model on any ticker: auto-loaded financials, editable growth, margin and WACC assumptions, and a live sensitivity heatmap.",
      },
      { property: "og:title", content: "DCF Valuation Terminal — Intrinsic Value of Any Stock" },
      {
        property: "og:description",
        content:
          "Auto-pull company financials, project free cash flows, and compare intrinsic value per share against the market price.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [symbol, setSymbol] = useState("");
  const fetchFinancials = useServerFn(getCompanyFinancials);

  const query = useQuery({
    queryKey: ["financials", symbol],
    queryFn: () => fetchFinancials({ data: { symbol } }),
    enabled: symbol.length > 0,
    retry: false,
  });

  const financials = query.data;
  const [assumptions, setAssumptions] = useState<Assumptions | null>(null);

  useEffect(() => {
    if (financials) setAssumptions(defaultAssumptions(financials));
  }, [financials]);

  const valuation = useMemo(() => (assumptions ? valuate(assumptions) : null), [assumptions]);
  const grid = useMemo(() => (assumptions ? sensitivity(assumptions) : null), [assumptions]);

  const currency = financials?.currency === "USD" ? "$" : "";
  const errorMessage = query.error instanceof Error ? query.error.message : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Discounted cash flow</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Valuation Terminal</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Pull a company's reported financials, project unlevered free cash flow, discount it at your own WACC,
          and see what the business is worth per share.
        </p>
      </header>

      <div className="mb-6 max-w-2xl">
        <TickerSearch onSubmit={setSymbol} loading={query.isFetching} initial={symbol} />
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          {errorMessage}
        </div>
      ) : null}

      {query.isFetching && !financials ? (
        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Loading financials for {symbol}…
        </div>
      ) : null}

      {!symbol && !financials ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Enter a ticker above to build a model.
        </div>
      ) : null}

      {financials && assumptions && valuation && grid ? (
        <div className="space-y-6">
          <CompanyHeader f={financials} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <AssumptionsPanel
                a={assumptions}
                onChange={(patch) => setAssumptions((prev) => (prev ? { ...prev, ...patch } : prev))}
                onReset={() => setAssumptions(defaultAssumptions(financials))}
              />
              <Section title="Free cash flow projection">
                <ProjectionTable v={valuation} currency={currency} />
              </Section>
              <Section title="Projected vs discounted cash flow">
                <FcfChart v={valuation} currency={currency} />
              </Section>
            </div>

            <div className="space-y-6">
              <ValuationSummary
                v={valuation}
                price={financials.price}
                currency={financials.currency}
                netDebt={assumptions.netDebt}
                shares={assumptions.sharesOutstanding}
              />
              <Section title="Sensitivity">
                <SensitivityGrid grid={grid} price={financials.price} />
              </Section>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            For research and education only — not investment advice. Financial data provided by Financial Modeling
            Prep.
          </p>
        </div>
      ) : null}
    </main>
  );
}
