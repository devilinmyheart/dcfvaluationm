import type { CompanyFinancials } from "./dcf";

export type CachedFinancials = { data: CompanyFinancials; fetchedAt: string };

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function readCachedFinancials(symbol: string): Promise<CachedFinancials | null> {
  try {
    const db = await admin();
    const { data, error } = await db
      .from("financials_cache")
      .select("payload, fetched_at")
      .eq("symbol", symbol)
      .maybeSingle();
    if (error || !data?.payload) return null;
    return {
      data: data.payload as unknown as CompanyFinancials,
      fetchedAt: String(data.fetched_at),
    };
  } catch {
    return null;
  }
}

export async function writeCachedFinancials(symbol: string, payload: CompanyFinancials): Promise<void> {
  try {
    const db = await admin();
    await db
      .from("financials_cache")
      .upsert(
        { symbol, payload: payload as unknown as Record<string, unknown>, fetched_at: new Date().toISOString() },
        { onConflict: "symbol" },
      );
  } catch {
    /* cache writes are best-effort */
  }
}

export function isFresh(fetchedAt: string, maxAgeMs = 24 * 60 * 60 * 1000): boolean {
  const t = Date.parse(fetchedAt);
  return Number.isFinite(t) && Date.now() - t < maxAgeMs;
}
