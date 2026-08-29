import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/diag")({
  server: {
    handlers: {
      GET: async () => {
        const out: Record<string, string> = {};
        const probe = async (name: string, url: string) => {
          try {
            const res = await fetch(url, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
              },
            });
            out[name] = `${res.status} ${(await res.text()).slice(0, 80)}`;
          } catch (e) {
            out[name] = `err ${(e as Error).message}`;
          }
        };
        await probe("ip", "https://api.ipify.org");
        await probe("chart", "https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS");
        return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
      },
    },
  },
});
