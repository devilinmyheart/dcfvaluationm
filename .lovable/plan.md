# Make Indian/global tickers survive Yahoo rate limits

## What's actually happening

Yahoo is throttling our server's IP, not rejecting our code — a plain command-line request from the same machine also came back `429` just now. Retrying harder alone won't fix that; the app needs to stop depending on a fresh Yahoo call for every valuation.

## The fix: cache every successful fetch

1. Turn on Lovable Cloud (built-in database) and add a small cache table for company financials, keyed by ticker.
2. On a valuation request the app reads the cache first. Fresh entry (under ~24h) is served instantly — no outside call at all.
3. Cache miss or stale entry: try the paid provider, then Yahoo with smarter retries. Any success is written back to the cache.
4. If Yahoo is throttled but we hold an older cached copy, serve that copy with a small "data as of <date>" note instead of an error.
5. Only when there is nothing cached and every source fails do you see an error — and it will say the source is busy and to retry, with your assumptions still editable.

Net effect: a ticker that loads once keeps working for everyone, and repeat views of Reliance, TCS, Infosys etc. never hit Yahoo again.

## Also included

- Better retry behaviour: alternate Yahoo hosts, honour `Retry-After`, exponential backoff with jitter, and a short in-memory circuit breaker so a throttled minute doesn't fire dozens of doomed requests.
- Search suggestions get the same cache treatment for recent queries, so the dropdown keeps working while Yahoo is cold.

## Technical notes

- Migration: `public.financials_cache` (`symbol` text primary key, `payload` jsonb, `fetched_at` timestamptz), RLS enabled, `GRANT SELECT` to anon/authenticated for reads and full access to `service_role`; writes happen server-side.
- `src/lib/marketdata.functions.ts`: `getCompanyFinancials` becomes read-cache -> FMP -> Yahoo -> write-cache -> stale-fallback. Return type gains `asOf?: string` and `stale?: boolean`; `src/routes/index.tsx` shows the "as of" note when `stale`.
- `src/lib/yahoo.server.ts`: retry loop reads `Retry-After`, adds jitter, and sets a module-level `blockedUntil` timestamp on repeated 429s so subsequent calls skip straight to cache.
- No new provider account or secret needed.

## Honest caveat

If a ticker has never been cached and Yahoo is throttling at that moment, it will still fail. Caching removes the repeat failures, not the very first one. If that turns out to be common, the fallback is a free API key from another provider — a small follow-up change.
