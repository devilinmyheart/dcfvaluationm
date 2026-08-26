import { createServerFn } from "@tanstack/react-start";
import type { CompanyFinancials, HistoryYear } from "./dcf";

type Json = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : Number.NaN;
  return Number.isFinite(n) ? n : 0;
};

async function fmp(path: string, params: Record<string, string>, apiKey: string): Promise<Json[]> {
  const qs = new URLSearchParams({ ...params, apikey: apiKey }).toString();
  const res = await fetch(`https://financialmodelingprep.com${path}?${qs}`);
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 402 || res.status === 403) {
      throw new Error(
        "This ticker isn't available on the current market data plan. Try a large US-listed company such as AAPL or MSFT.",
      );
    }
    throw new Error(`Market data request failed [${res.status}]: ${text.slice(0, 300)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Market data provider returned an unreadable response.");
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Json;
    if (typeof obj["Error Message"] === "string") throw new Error(String(obj["Error Message"]));
    return [obj];
  }
  return (parsed as Json[]) ?? [];
}

/** Uses the current `/stable` API (legacy `/api/v3` endpoints are retired). */
async function fetchStable(
  stablePath: string,
  symbol: string,
  apiKey: string,
  limit?: number,
): Promise<Json[]> {
  const params: Record<string, string> = { symbol };
  if (limit) params["limit"] = String(limit);
  return fmp(stablePath, params, apiKey);
}


export const getCompanyFinancials = createServerFn({ method: "GET" })
  .inputValidator((input: { symbol: string }) => {
    const symbol = String(input?.symbol ?? "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z0-9.\-^]{1,15}$/.test(symbol)) throw new Error("Enter a valid ticker symbol.");
    return { symbol };
  })
  .handler(async ({ data }): Promise<CompanyFinancials> => {
    const { symbol } = data;
    const apiKey = process.env["FMP_API_KEY"];

    const yahoo = async (): Promise<CompanyFinancials> => {
      const { fetchYahooFinancials } = await import("./yahoo.server");
      return fetchYahooFinancials(symbol);
    };

    if (!apiKey) return yahoo();

    try {
      return await fetchFromFmp(symbol, apiKey);
    } catch (err) {
      try {
        return await yahoo();
      } catch {
        throw err instanceof Error ? err : new Error(`No financial data found for "${symbol}".`);
      }
    }
  });

async function fetchFromFmp(symbol: string, apiKey: string): Promise<CompanyFinancials> {
  {
    const [profileRows, income, cashflow, balance] = await Promise.all([
      fetchStable("/stable/profile", symbol, apiKey),
      fetchStable("/stable/income-statement", symbol, apiKey, 5),
      fetchStable("/stable/cash-flow-statement", symbol, apiKey, 5),
      fetchStable("/stable/balance-sheet-statement", symbol, apiKey, 5),
    ]);



    const profile = profileRows[0];
    if (!profile || !income.length) {
      throw new Error(`No financial data found for "${symbol}".`);
    }

    const byYear = (rows: Json[]) => {
      const map = new Map<number, Json>();
      for (const r of rows) {
        const year = num(r["fiscalYear"] ?? r["calendarYear"] ?? String(r["date"] ?? "").slice(0, 4));
        if (year) map.set(year, r);
      }
      return map;
    };
    const cf = byYear(cashflow);
    const bs = byYear(balance);

    const history: HistoryYear[] = income
      .map((r) => {
        const year = num(r["fiscalYear"] ?? r["calendarYear"] ?? String(r["date"] ?? "").slice(0, 4));
        const c = cf.get(year) ?? {};
        const revenue = num(r["revenue"]);
        const ebit = num(r["operatingIncome"] ?? r["ebit"]);
        const da = num(c["depreciationAndAmortization"] ?? r["depreciationAndAmortization"]);
        const capex = Math.abs(num(c["capitalExpenditure"]));
        const changeNwc = -num(c["changeInWorkingCapital"]);
        const pretax = num(r["incomeBeforeTax"]);
        const tax = num(r["incomeTaxExpense"]);
        const taxRate = pretax > 0 ? Math.min(Math.max(tax / pretax, 0), 0.5) : 0.21;
        return {
          year,
          revenue,
          ebit,
          ebitda: num(r["ebitda"]) || ebit + da,
          da,
          capex,
          changeNwc,
          taxRate,
          netIncome: num(r["netIncome"]),
          freeCashFlow: num(c["freeCashFlow"]) || ebit * (1 - taxRate) + da - capex,
        };
      })
      .filter((h) => h.year > 0 && h.revenue > 0)
      .sort((a, b) => a.year - b.year);

    const latestYear = history[history.length - 1]?.year ?? 0;
    const latestBs = bs.get(latestYear) ?? balance[0] ?? {};
    const latestIs = income.find(
      (r) => num(r["fiscalYear"] ?? r["calendarYear"] ?? String(r["date"] ?? "").slice(0, 4)) === latestYear,
    );

    const price = num(profile["price"]);
    const marketCap = num(profile["marketCap"] ?? profile["mktCap"]);
    const dilutedShares = num(latestIs?.["weightedAverageShsOutDil"]);
    const sharesOutstanding =
      dilutedShares || (price > 0 && marketCap > 0 ? marketCap / price : 0);

    return {
      symbol,
      name: String(profile["companyName"] ?? symbol),
      exchange: String(profile["exchange"] ?? profile["exchangeShortName"] ?? ""),
      currency: String(profile["currency"] ?? "USD"),
      price,
      sharesOutstanding,
      marketCap: marketCap || price * sharesOutstanding,
      beta: num(profile["beta"]) || 1,
      totalDebt: num(latestBs["totalDebt"]),
      cash: num(latestBs["cashAndShortTermInvestments"] ?? latestBs["cashAndCashEquivalents"]),
      history,
    };
  }
}


export type CompanyMatch = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
};

export const searchCompanies = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string }) => {
    const q = String(input?.query ?? "").trim().slice(0, 60);
    return { query: q };
  })
  .handler(async ({ data }): Promise<CompanyMatch[]> => {
    const apiKey = process.env["FMP_API_KEY"];
    if (data.query.length < 2) return [];

    const safe = async (path: string): Promise<Json[]> => {
      if (!apiKey) return [];
      try {
        return await fmp(path, { query: data.query, limit: "10" }, apiKey);
      } catch {
        return [];
      }
    };

    const yahoo = async (): Promise<CompanyMatch[]> => {
      try {
        const { searchYahoo } = await import("./yahoo.server");
        return await searchYahoo(data.query);
      } catch {
        return [];
      }
    };

    const [byName, bySymbol, global] = await Promise.all([
      safe("/stable/search-name"),
      safe("/stable/search-symbol"),
      yahoo(),
    ]);

    const seen = new Set<string>();
    const out: CompanyMatch[] = [];
    const push = (m: CompanyMatch) => {
      if (!m.symbol || seen.has(m.symbol) || out.length >= 10) return;
      seen.add(m.symbol);
      out.push(m);
    };

    for (const r of [...bySymbol, ...byName]) {
      push({
        symbol: String(r["symbol"] ?? "").toUpperCase(),
        name: String(r["name"] ?? r["companyName"] ?? r["symbol"] ?? ""),
        exchange: String(r["exchangeFullName"] ?? r["exchange"] ?? ""),
        currency: String(r["currency"] ?? ""),
      });
    }
    for (const m of global) push(m);

    return out;
  });

