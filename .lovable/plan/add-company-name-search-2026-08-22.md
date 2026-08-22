# Add company-name search

## Why it's ticker-only today

The search box submits whatever you type straight to the financials lookup, and that lookup only calls symbol-based endpoints (profile, income statement, cash flow, balance sheet). There is no name-to-ticker lookup anywhere in the app, so "Apple" never resolves to AAPL.

## What to build

1. **Name lookup**: a new server function that queries the market data provider's name/symbol search endpoint and returns up to 8 matches (symbol, company name, exchange, currency).
2. **Autocomplete dropdown**: as you type 2+ characters, show matching companies under the search box (debounced ~300ms). Picking one loads the valuation for that ticker. Typing an exact ticker and pressing Enter still works as it does now, so nothing you rely on changes.
3. **Input polish**: stop force-uppercasing the field (it makes company names look odd); uppercase only when the input is a plain ticker on submit.
4. **Clearer errors**: when the provider rejects a symbol as not covered by the current plan, show a plain-language message ("This ticker isn't available on the current market data plan") instead of the raw provider text.

## Technical notes

- New `searchCompanies` server function in `src/lib/marketdata.functions.ts`, using the provider's `/stable/search-name` and `/stable/search-symbol` endpoints, deduped by symbol, with the same input validation and error handling helper (`fmp`) already in place.
- `src/components/dcf/TickerSearch.tsx` gains local debounce state, a results list with keyboard navigation (arrow keys + Enter + Escape), and calls `onSubmit(symbol)` on selection — the parent page's data flow is unchanged.
- If the provider's search endpoint isn't available on the current plan, fall back gracefully: hide the dropdown and keep ticker-only entry rather than surfacing an error.
