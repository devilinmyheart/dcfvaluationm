export type HistoryYear = {
  year: number;
  revenue: number;
  ebit: number;
  ebitda: number;
  da: number;
  capex: number;
  changeNwc: number;
  taxRate: number;
  netIncome: number;
  freeCashFlow: number;
};

export type CompanyFinancials = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  sharesOutstanding: number;
  marketCap: number;
  beta: number;
  totalDebt: number;
  cash: number;
  history: HistoryYear[];
  /** ISO timestamp of when this data was fetched from the provider (cached results). */
  asOf?: string;
  /** True when served from cache because live sources were unavailable. */
  stale?: boolean;
};

export type TerminalMethod = "perpetuity" | "exit-multiple";

export type Assumptions = {
  horizon: number;
  baseRevenue: number;
  startGrowth: number;
  fadeToTerminal: boolean;
  ebitMargin: number;
  taxRate: number;
  daPct: number;
  capexPct: number;
  nwcPct: number;
  terminalMethod: TerminalMethod;
  terminalGrowth: number;
  exitMultiple: number;
  // WACC build-up
  riskFreeRate: number;
  equityRiskPremium: number;
  beta: number;
  costOfDebt: number;
  debtWeight: number;
  waccOverride: number | null;
  // Bridge
  netDebt: number;
  sharesOutstanding: number;
};

export type ProjectionRow = {
  year: number;
  growth: number;
  revenue: number;
  ebit: number;
  ebitda: number;
  nopat: number;
  da: number;
  capex: number;
  changeNwc: number;
  fcf: number;
  discountFactor: number;
  pv: number;
};

export type Valuation = {
  wacc: number;
  rows: ProjectionRow[];
  pvOfFcf: number;
  terminalValue: number;
  pvOfTerminal: number;
  enterpriseValue: number;
  equityValue: number;
  intrinsicPerShare: number;
  terminalShare: number;
};

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function computeWacc(a: Assumptions): number {
  if (a.waccOverride !== null && Number.isFinite(a.waccOverride)) return a.waccOverride;
  const we = clamp(1 - a.debtWeight, 0, 1);
  const wd = clamp(a.debtWeight, 0, 1);
  const costOfEquity = a.riskFreeRate + a.beta * a.equityRiskPremium;
  const afterTaxDebt = a.costOfDebt * (1 - a.taxRate);
  return we * costOfEquity + wd * afterTaxDebt;
}

/** Growth path: either flat at startGrowth, or linearly fading to terminal growth. */
export function growthPath(a: Assumptions): number[] {
  const n = Math.max(1, Math.round(a.horizon));
  if (!a.fadeToTerminal) return Array.from({ length: n }, () => a.startGrowth);
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 1 : i / (n - 1);
    return a.startGrowth + (a.terminalGrowth - a.startGrowth) * t;
  });
}

export function valuate(a: Assumptions): Valuation {
  const wacc = computeWacc(a);
  const growths = growthPath(a);
  const currentYear = new Date().getFullYear();

  let revenue = a.baseRevenue;
  const rows: ProjectionRow[] = [];

  for (let i = 0; i < growths.length; i++) {
    const g = growths[i]!;
    const prevRevenue = revenue;
    revenue = prevRevenue * (1 + g);
    const ebit = revenue * a.ebitMargin;
    const da = revenue * a.daPct;
    const capex = revenue * a.capexPct;
    const changeNwc = (revenue - prevRevenue) * a.nwcPct;
    const nopat = ebit * (1 - a.taxRate);
    const fcf = nopat + da - capex - changeNwc;
    const discountFactor = 1 / Math.pow(1 + wacc, i + 1);
    rows.push({
      year: currentYear + i + 1,
      growth: g,
      revenue,
      ebit,
      ebitda: ebit + da,
      nopat,
      da,
      capex,
      changeNwc,
      fcf,
      discountFactor,
      pv: fcf * discountFactor,
    });
  }

  const last = rows[rows.length - 1]!;
  let terminalValue: number;
  if (a.terminalMethod === "exit-multiple") {
    terminalValue = last.ebitda * a.exitMultiple;
  } else {
    const spread = wacc - a.terminalGrowth;
    terminalValue = spread > 0.0001 ? (last.fcf * (1 + a.terminalGrowth)) / spread : Number.NaN;
  }

  const pvOfFcf = rows.reduce((s, r) => s + r.pv, 0);
  const pvOfTerminal = terminalValue * last.discountFactor;
  const enterpriseValue = pvOfFcf + pvOfTerminal;
  const equityValue = enterpriseValue - a.netDebt;
  const intrinsicPerShare = a.sharesOutstanding > 0 ? equityValue / a.sharesOutstanding : Number.NaN;

  return {
    wacc,
    rows,
    pvOfFcf,
    terminalValue,
    pvOfTerminal,
    enterpriseValue,
    equityValue,
    intrinsicPerShare,
    terminalShare: enterpriseValue ? pvOfTerminal / enterpriseValue : Number.NaN,
  };
}

export type SensitivityGrid = {
  rowLabels: string[];
  colLabels: string[];
  values: number[][];
  rowTitle: string;
  colTitle: string;
};

/** WACC (rows) x terminal growth or exit multiple (cols) intrinsic value per share. */
export function sensitivity(a: Assumptions): SensitivityGrid {
  const baseWacc = computeWacc(a);
  const waccs = [-0.02, -0.01, 0, 0.01, 0.02].map((d) => baseWacc + d);
  const isPerp = a.terminalMethod === "perpetuity";
  const cols = isPerp
    ? [-0.01, -0.005, 0, 0.005, 0.01].map((d) => a.terminalGrowth + d)
    : [-4, -2, 0, 2, 4].map((d) => a.exitMultiple + d);

  const values = waccs.map((w) =>
    cols.map((c) =>
      valuate({
        ...a,
        waccOverride: w,
        terminalGrowth: isPerp ? c : a.terminalGrowth,
        exitMultiple: isPerp ? a.exitMultiple : c,
      }).intrinsicPerShare,
    ),
  );

  return {
    rowTitle: "WACC",
    colTitle: isPerp ? "Terminal growth" : "Exit EV/EBITDA",
    rowLabels: waccs.map((w) => `${(w * 100).toFixed(1)}%`),
    colLabels: cols.map((c) => (isPerp ? `${(c * 100).toFixed(1)}%` : `${c.toFixed(1)}x`)),
    values,
  };
}

export function defaultAssumptions(f: CompanyFinancials): Assumptions {
  const hist = [...f.history].sort((x, y) => x.year - y.year);
  const latest = hist[hist.length - 1];
  const first = hist[0];
  const baseRevenue = latest?.revenue ?? 0;

  let cagr = 0.06;
  if (first && latest && hist.length > 1 && first.revenue > 0) {
    const years = latest.year - first.year || hist.length - 1;
    cagr = Math.pow(latest.revenue / first.revenue, 1 / years) - 1;
  }

  const avg = (fn: (h: HistoryYear) => number) => {
    const vals = hist.map(fn).filter((v) => Number.isFinite(v));
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  };

  const ebitMargin = clamp(avg((h) => (h.revenue ? h.ebit / h.revenue : 0)), -0.5, 0.7);
  const taxRate = clamp(avg((h) => h.taxRate), 0, 0.5) || 0.21;
  const daPct = clamp(avg((h) => (h.revenue ? h.da / h.revenue : 0)), 0, 0.4);
  const capexPct = clamp(avg((h) => (h.revenue ? h.capex / h.revenue : 0)), 0, 0.4);
  const nwcPct = clamp(avg((h) => (h.revenue ? h.changeNwc / h.revenue : 0)), -0.3, 0.3);

  const netDebt = f.totalDebt - f.cash;
  const debtWeight =
    f.marketCap + f.totalDebt > 0 ? clamp(f.totalDebt / (f.marketCap + f.totalDebt), 0, 0.9) : 0.2;

  return {
    horizon: 5,
    baseRevenue,
    startGrowth: clamp(cagr, -0.1, 0.35),
    fadeToTerminal: true,
    ebitMargin,
    taxRate,
    daPct,
    capexPct,
    nwcPct,
    terminalMethod: "perpetuity",
    terminalGrowth: 0.025,
    exitMultiple: 12,
    riskFreeRate: 0.042,
    equityRiskPremium: 0.05,
    beta: f.beta && Number.isFinite(f.beta) ? clamp(f.beta, 0.2, 3) : 1,
    costOfDebt: 0.05,
    debtWeight,
    waccOverride: null,
    netDebt,
    sharesOutstanding: f.sharesOutstanding,
  };
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  HKD: "HK$",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  CHF: "CHF ",
  BRL: "R$",
  ZAR: "R",
  KRW: "₩",
  SEK: "kr ",
};

/** Maps an ISO currency code to a display symbol (falls back to "CODE "). */
export function currencySymbol(code?: string | null) {
  const key = (code ?? "").toUpperCase();
  if (!key) return "";
  return CURRENCY_SYMBOLS[key] ?? `${key} `;
}

const compact = (n: number, currency: string) => {
  const abs = Math.abs(n);
  const unit = abs >= 1e12 ? ["T", 1e12] : abs >= 1e9 ? ["B", 1e9] : abs >= 1e6 ? ["M", 1e6] : ["", 1];
  const v = n / (unit[1] as number);
  return `${currency}${v.toFixed(abs >= 1e6 ? 2 : 0)}${unit[0]}`;
};


export function fmtMoney(n: number, currency = "$") {
  if (!Number.isFinite(n)) return "n/a";
  return `${n < 0 ? "-" : ""}${compact(Math.abs(n), currency)}`;
}

export function fmtPrice(n: number, currency = "$") {
  if (!Number.isFinite(n)) return "n/a";
  return `${n < 0 ? "-" : ""}${currency}${Math.abs(n).toFixed(2)}`;
}

export function fmtPct(n: number, digits = 1) {
  if (!Number.isFinite(n)) return "n/a";
  return `${(n * 100).toFixed(digits)}%`;
}
