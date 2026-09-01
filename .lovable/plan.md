# Fix Indian ticker resolution and cold-cache failures

## Goal
Make searches such as `IOC` reliably resolve to the intended Indian listing and avoid showing a provider rate-limit error as the primary user experience.

## Plan
1. **Resolve ambiguous symbols before valuation**
   - Add a server-side symbol resolver that uses the existing company-search results to map an entered company name or bare ticker to its canonical exchange ticker.
   - Prefer an exact Indian-market match such as `IOC.NS` when the entered value is `IOC`, while preserving already-qualified symbols and valid US tickers.
   - Use the same resolver whether the user selects a suggestion or presses Enter directly.

2. **Strengthen the cache path**
   - Normalize cache keys to canonical symbols so `IOC` and `IOC.NS` share one cached result.
   - Add request de-duplication so simultaneous searches for the same company trigger only one upstream fetch.
   - Continue serving any available cached copy when live refresh fails, regardless of age, with the existing “as of” notice.

3. **Handle true cold-cache throttling cleanly**
   - Stop retrying the backup source from multiple stages once its circuit breaker is open.
   - Return a structured temporary-unavailable result for a genuine cold miss instead of exposing the provider-specific rate-limit message.
   - Keep the entered company selected and provide a clear Retry action after the cooldown.

4. **Verify the reported case**
   - Test direct entry and autocomplete selection for `IOC`/`IOC.NS`.
   - Confirm the first successful response is cached under the canonical ticker and subsequent requests are served from cache.
   - Verify an already-cached stock still loads while the backup source is throttled, and check the final build and responsive UI states.

## Technical details
- Update the market-data server function to return canonical-symbol metadata and typed temporary-failure information.
- Update the ticker search submit path so free-text submission resolves before fetching financial statements.
- Reuse the existing `financials_cache` table; no new user data or authentication changes are required.
