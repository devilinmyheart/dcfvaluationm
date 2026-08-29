import { createFileRoute } from "@tanstack/react-router";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export const Route = createFileRoute("/api/public/diag")({
  server: {
    handlers: {
      GET: async () => {
        const out: Record<string, string> = {};
        try {
          const r = await fetch("https://httpbin.org/headers", { headers: { "User-Agent": UA } });
          out["headers"] = (await r.text()).slice(0, 600);
        } catch (e) {
          out["headers"] = `err ${(e as Error).message}`;
        }
        try {
          const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS", {
            headers: { "User-Agent": UA },
          });
          out["chart"] = `${r.status}`;
        } catch (e) {
          out["chart"] = `err ${(e as Error).message}`;
        }
        return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
      },
    },
  },
});
