import { useState, type FormEvent } from "react";
import { Search, Loader2 } from "lucide-react";

const SUGGESTIONS = ["AAPL", "MSFT", "GOOGL", "NVDA", "KO"];

export function TickerSearch({
  onSubmit,
  loading,
  initial,
}: {
  onSubmit: (symbol: string) => void;
  loading: boolean;
  initial?: string;
}) {
  const [value, setValue] = useState(initial ?? "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const symbol = value.trim().toUpperCase();
    if (symbol) onSubmit(symbol);
  };

  return (
    <div>
      <form onSubmit={submit} className="flex gap-2">
        <div className="flex flex-1 items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
          <Search className="ml-3 size-4 text-muted-foreground" aria-hidden />
          <input
            aria-label="Ticker symbol"
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            placeholder="Enter a ticker, e.g. AAPL"
            className="num w-full bg-transparent px-3 py-2.5 text-sm uppercase text-foreground placeholder:normal-case placeholder:text-muted-foreground/70 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Value it
        </button>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span>Try:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setValue(s);
              onSubmit(s);
            }}
            className="num rounded border border-border px-1.5 py-0.5 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
