import { createFileRoute } from "@tanstack/react-router";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export const Route = createFileRoute("/api/public/diag")({
  server: {
    handlers: {
      GET: async () => {
        const out: Record<string, string> = {};
        const variants: Record<string, Record<string, string>> = {
          plain: {},
          ua: { "User-Agent": UA },
          curlua: { "User-Agent": "curl/8.0" },
          browserish: {
            "User-Agent": UA,
            Accept: "application/json,text/plain,*/*",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: "https://finance.yahoo.com/",
            Origin: "https://finance.yahoo.com",
          },
        };
        for (const [name, headers] of Object.entries(variants)) {
          try {
            const r = await fetch("https://query2.finance.yahoo.com/v8/finance/chart/RELIANCE.NS", { headers });
            out[name] = String(r.status);
          } catch (e) {
            out[name] = `err ${(e as Error).message}`;
          }
        }
        return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
      },
    },
  },
});
