# Add Indian (and global) stock coverage

## Why only US stocks work today

Confirmed against the live provider: the current market data plan (Financial Modeling Prep free tier) returns Indian names in search, but every financials call for a `.NS` / `.BO` symbol comes back `402 — not available under your current subscription`. So NSE/BSE tickers can be found but never valued.

## The fix: add a second, free data source

Add Yahoo Finance as a fallback provider. Verified in this session that it returns full statements for `RELIANCE.NS` (revenue, EBIT, D&A, capex, working capital, debt, cash, price, shares) with no API key and no paid plan — and its search covers NSE/BSE names.

How it behaves for you:

1. Search shows Indian, US and other global listings, each labelled with its exchange (NSE, BSE, NASDAQ...).
2. Picking a company tries the primary provider first; if that ticker isn't covered by the plan, the app silently falls back to Yahoo instead of erroring.
3. Currency follows the listing — Indian companies show ₹ and Indian-scale numbers (Cr/Lakh-friendly formatting via compact notation), US ones keep $.
4. If both sources fail for a symbol, you get a plain-language message and can still edit assumptions manually.

## Technical notes

- New `src/lib/yahoo.server.ts`: cookie + crumb bootstrap (`fc.yahoo.com` → `/v1/test/getcrumb`, cached in memory per worker), then `quoteSummary` with `price`, `defaultKeyStatistics`, `incomeStatementHistory`, `cashflowStatementHistory`, `balanceSheetHistory`; maps into the existing `CompanyFinancials` / `HistoryYear` DTO so `dcf.ts` and every component stay untouched.
- `src/lib/marketdata.functions.ts`: `getCompanyFinancials` keeps the FMP path, catches plan/coverage errors and empty results, then awaits `import("./yahoo.server")` inside the handler. `searchCompanies` merges FMP results with Yahoo's `/v1/finance/search` (equities only), deduped by symbol, so Indian names always appear even when FMP search is limited.
- Currency symbol handling moves out of the hardcoded `"USD" ? "$" : ""` check in `src/routes/index.tsx` into a small `formatCurrency` helper (USD $, INR ₹, EUR €, GBP £, else code prefix) used by the header, table, summary and charts.
- Yahoo statements are annual and typically 4 years — projection seeding already tolerates a variable-length history.
- No database or new secret required.
