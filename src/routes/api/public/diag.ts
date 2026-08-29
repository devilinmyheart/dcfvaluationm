import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/diag")({
  server: {
    handlers: {
      GET: async () => {
        const out: Record<string, string> = {};
        const cookieFrom = async (name: string, url: string, headers: Record<string, string>) => {
          try {
            const res = await fetch(url, { headers });
            const gsc = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
            out[name] = `${res.status} n=${gsc.length} len=${(res.headers.get("set-cookie") ?? "").length}`;
            return gsc.map((c) => c.split(";")[0]).join("; ");
          } catch (e) {
            out[name] = `err ${(e as Error).message}`;
            return "";
          }
        };
        const c1 = await cookieFrom("fc_noua", "https://fc.yahoo.com", {});
        const c2 = await cookieFrom("yahoo_home", "https://finance.yahoo.com/", {});
        const cookie = c1 || c2;
        try {
          const r = await fetch(
            "https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/RELIANCE.NS?symbol=RELIANCE.NS&type=annualTotalRevenue&period1=1000000000&period2=9999999999",
            { headers: { Accept: "application/json", ...(cookie ? { Cookie: cookie } : {}) } },
          );
          out["ts"] = `${r.status} ${(await r.text()).slice(0, 80)}`;
        } catch (e) {
          out["ts"] = `err ${(e as Error).message}`;
        }
        return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
      },
    },
  },
});
