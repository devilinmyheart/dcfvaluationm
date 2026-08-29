import type { CompanyFinancials, HistoryYear } from "./dcf";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

type Session = { cookie: string; crumb: string; at: number };
let session: Session | null = null;

async function getSession(): Promise<Session> {
  if (session && Date.now() - session.at < 30 * 60_000) return session;

  let cookie = "";
  try {
    const res = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": UA } });
    const raw =
      typeof (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function"
        ? (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie().join("; ")
        : (res.headers.get("set-cookie") ?? "");
    cookie = raw
      .split(/,(?=[^;]+?=)/)
      .map((c) => c.split(";")[0]?.trim() ?? "")
      .filter(Boolean)
      .join("; ");
  } catch {
    cookie = "";
  }

  let crumb = "";
  for (const host of ["query1", "query2"]) {
    try {
      const res = await fetch(`https://${host}.finance.yahoo.com/v1/test/getcrumb`, {
        headers: { "User-Agent": UA, Accept: "*/*", ...(cookie ? { Cookie: cookie } : {}) },
      });
      const text = (await res.text()).trim();
      if (res.ok && text && text.length < 32 && !text.startsWith("<")) {
        crumb = text;
        break;
      }
    } catch {
      /* try next host */
    }
  }

  session = { cookie, crumb, at: Date.now() };
  return session;
}



async function yfetch(url: string): Promise<unknown> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const s = await getSession();
    const withCrumb = s.crumb ? `${url}${url.includes("?") ? "&" : "?"}crumb=${encodeURIComponent(s.crumb)}` : url;
    const res = await fetch(withCrumb, {
      headers: { "User-Agent": UA, Accept: "application/json", ...(s.cookie ? { Cookie: s.cookie } : {}) },
    });
    const text = await res.text();
    if (res.ok) {
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("The backup data source returned an unreadable response.");
      }
    }
    lastStatus = res.status;
    session = null;
    if (res.status !== 429 && res.status !== 503) break;
    await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
  }
  if (lastStatus === 429 || lastStatus === 503) {
    throw new Error(
      "The backup data source is rate-limiting requests right now. Wait a minute and try this ticker again.",
    );
  }
  throw new Error(`Backup data source request failed [${lastStatus}].`);
}


const raw = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v && typeof v === "object" && "raw" in (v as Record<string, unknown>)) {
    const n = Number((v as Record<string, unknown>)["raw"]);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const TYPES = [
  "annualTotalRevenue",
  "annualOperatingIncome",
  "annualEBITDA",
  "annualDepreciationAndAmortization",
  "annualCapitalExpenditure",
  "annualChangeInWorkingCapital",
  "annualPretaxIncome",
  "annualTaxProvision",
  "annualNetIncome",
  "annualFreeCashFlow",
  "annualTotalDebt",
  "annualCashCashEquivalentsAndShortTermInvestments",
  "annualCashAndCashEquivalents",
  "annualDilutedAverageShares",
] as const;

type Series = Map<string, Map<number, number>>;

async function fetchTimeseries(symbol: string): Promise<Series> {
  const now = Math.floor(Date.now() / 1000);
  const url =
    `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}` +
    `?symbol=${encodeURIComponent(symbol)}&type=${TYPES.join(",")}&period1=1000000000&period2=${now + 86400}`;
  const json = (await yfetch(url)) as {
    timeseries?: { result?: Array<Record<string, unknown>> };
  };
  const out: Series = new Map();
  for (const r of json.timeseries?.result ?? []) {
    const meta = r["meta"] as { type?: string[] } | undefined;
    const type = meta?.type?.[0];
    if (!type) continue;
    const rows = r[type];
    if (!Array.isArray(rows)) continue;
    const byYear = out.get(type) ?? new Map<number, number>();
    for (const row of rows as Array<Record<string, unknown> | null>) {
      if (!row) continue;
      const year = Number(String(row["asOfDate"] ?? "").slice(0, 4));
      if (!year) continue;
      byYear.set(year, raw(row["reportedValue"]));
    }
    out.set(type, byYear);
  }
  return out;
}

export async function fetchYahooFinancials(symbol: string): Promise<CompanyFinancials> {
  const [series, quoteJson] = await Promise.all([
    fetchTimeseries(symbol),
    yfetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price,defaultKeyStatistics`,
    ) as Promise<{ quoteSummary?: { result?: Array<Record<string, unknown>> } }>,
  ]);

  const result = quoteJson.quoteSummary?.result?.[0] ?? {};
  const price = (result["price"] ?? {}) as Record<string, unknown>;
  const stats = (result["defaultKeyStatistics"] ?? {}) as Record<string, unknown>;

  const get = (type: string, year: number) => series.get(type)?.get(year) ?? 0;
  const years = [...(series.get("annualTotalRevenue")?.keys() ?? [])].sort((a, b) => a - b);

  const history: HistoryYear[] = years
    .map((year) => {
      const revenue = get("annualTotalRevenue", year);
      const ebit = get("annualOperatingIncome", year);
      const da = get("annualDepreciationAndAmortization", year);
      const capex = Math.abs(get("annualCapitalExpenditure", year));
      const pretax = get("annualPretaxIncome", year);
      const tax = get("annualTaxProvision", year);
      const taxRate = pretax > 0 ? Math.min(Math.max(tax / pretax, 0), 0.5) : 0.25;
      return {
        year,
        revenue,
        ebit,
        ebitda: get("annualEBITDA", year) || ebit + da,
        da,
        capex,
        // Yahoo reports the cash-flow sign convention: a positive value releases cash.
        changeNwc: -get("annualChangeInWorkingCapital", year),
        taxRate,
        netIncome: get("annualNetIncome", year),
        freeCashFlow: get("annualFreeCashFlow", year) || ebit * (1 - taxRate) + da - capex,
      };
    })
    .filter((h) => h.revenue > 0);

  if (!history.length) throw new Error(`No financial data found for "${symbol}".`);

  const latestYear = history[history.length - 1]!.year;
  const marketPrice = raw(price["regularMarketPrice"]);
  const marketCap = raw(price["marketCap"]);
  const shares =
    get("annualDilutedAverageShares", latestYear) ||
    raw(stats["sharesOutstanding"]) ||
    (marketPrice > 0 && marketCap > 0 ? marketCap / marketPrice : 0);

  return {
    symbol: symbol.toUpperCase(),
    name: String(price["longName"] ?? price["shortName"] ?? symbol),
    exchange: String(price["exchangeName"] ?? price["exchange"] ?? ""),
    currency: String(price["currency"] ?? "USD").toUpperCase(),
    price: marketPrice,
    sharesOutstanding: shares,
    marketCap: marketCap || marketPrice * shares,
    beta: raw(stats["beta"]) || 1,
    totalDebt: get("annualTotalDebt", latestYear),
    cash:
      get("annualCashCashEquivalentsAndShortTermInvestments", latestYear) ||
      get("annualCashAndCashEquivalents", latestYear),
    history,
  };
}

export type YahooMatch = { symbol: string; name: string; exchange: string; currency: string };

export async function searchYahoo(query: string): Promise<YahooMatch[]> {
  const json = (await yfetch(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
  )) as { quotes?: Array<Record<string, unknown>> };
  return (json.quotes ?? [])
    .filter((q) => String(q["quoteType"] ?? "") === "EQUITY" && q["symbol"])
    .map((q) => ({
      symbol: String(q["symbol"]).toUpperCase(),
      name: String(q["longname"] ?? q["shortname"] ?? q["symbol"]),
      exchange: String(q["exchDisp"] ?? q["exchange"] ?? ""),
      currency: "",
    }));
}
