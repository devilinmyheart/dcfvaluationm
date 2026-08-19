# DCF Stock Valuation Model

An advanced discounted cash flow tool: enter a ticker, auto-pull the company's financials, project free cash flows, and compare intrinsic value per share against the market price — with a full sensitivity heatmap.

## Main page (`/`)

1. **Ticker search bar** — type a symbol (e.g. AAPL), fetch company profile, price, shares outstanding, and the last 5 years of income statement, balance sheet and cash-flow data.
2. **Company header** — name, exchange, current price, market cap, beta, and trailing revenue / FCF.
3. **Assumptions panel** (all editable, pre-filled from fetched history):
   - Forecast horizon: 5 or 10 years
   - Revenue growth per year (auto-seeded from historical CAGR, with fade-to-terminal option)
   - EBIT margin, effective tax rate
   - Capex as % of revenue, D&A as % of revenue, change in net working capital as % of revenue
   - Terminal method: perpetuity growth **or** exit EV/EBITDA multiple
   - WACC build-up: risk-free rate, equity risk premium, beta, cost of debt, debt/equity weights, tax shield → computed WACC (override allowed)
4. **Projection table** — year-by-year revenue, EBIT, NOPAT, +D&A, −capex, −ΔNWC, unlevered FCF, discount factor, PV.
5. **Valuation summary** — sum of PV of FCF, PV of terminal value, enterprise value, minus net debt, ÷ diluted shares → intrinsic value per share, plus upside/downside vs market price and a verdict (undervalued / fair / overvalued).
6. **Charts** — projected FCF bars with PV overlay; a waterfall from enterprise value to equity value per share.
7. **Sensitivity heatmap** — intrinsic value per share across a WACC × terminal-growth (or exit multiple) grid, color-coded against current price.
8. Reset-to-defaults and "recalculate from history" controls; every input change recomputes instantly.

## Data source

Financial data comes from a market data provider (Financial Modeling Prep by default — free tier covers profile, quote, and the three statements). It needs an API key, which will be requested through the secure secret form before wiring the fetch. The key is used only in server-side code, never exposed to the browser. If the ticker isn't found or the provider errors, the page shows a clear message and keeps manual editing available so the model still works.

## Design

Dark, terminal-inspired finance aesthetic: deep slate background, tabular monospace numerals for figures, restrained green/red for upside/downside, one accent color for interactive controls. Dense but readable — data tables, not marketing cards. All colors defined as semantic tokens in the design system.

## Technical notes

- New route `src/routes/index.tsx` (replaces the placeholder) with the valuation UI split into components: `TickerSearch`, `CompanyHeader`, `AssumptionsPanel`, `WaccBuilder`, `ProjectionTable`, `ValuationSummary`, `SensitivityGrid`, `FcfChart`.
- Pure DCF math in `src/lib/dcf.ts` (no side effects): FCF projection, discounting, terminal value (Gordon growth + exit multiple), EV→equity bridge, sensitivity grid generator. Unit-testable and reused by every view.
- Data fetching via `createServerFn` in `src/lib/marketdata.functions.ts`, reading the API key with `process.env` inside the handler; normalizes the provider payload into a typed `CompanyFinancials` DTO and seeds default assumptions.
- TanStack Query (`useQuery` via `useServerFn`) for the ticker fetch; assumptions kept in local React state so recalcs are instant and offline.
- Charts with Recharts; heatmap rendered as a CSS grid with token-based color scaling.
- Route `head()` with a DCF-specific title, description, og/twitter tags.

No database is needed for this scope — nothing is saved between sessions. Saved scenarios can be added later with Lovable Cloud if wanted.
