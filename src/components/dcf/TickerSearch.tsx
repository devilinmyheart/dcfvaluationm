import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Search, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { searchCompanies, type CompanyMatch } from "@/lib/marketdata.functions";

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
  const [matches, setMatches] = useState<CompanyMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const search = useServerFn(searchCompanies);
  const pickedRef = useRef(false);

  useEffect(() => {
    const q = value.trim();
    if (pickedRef.current) {
      pickedRef.current = false;
      return;
    }
    if (q.length < 2) {
      setMatches([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      search({ data: { query: q } })
        .then((rows) => {
          if (cancelled) return;
          setMatches(rows);
          setActive(-1);
          setOpen(rows.length > 0);
        })
        .catch(() => {
          if (!cancelled) {
            setMatches([]);
            setOpen(false);
          }
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, search]);

  const pick = (symbol: string) => {
    pickedRef.current = true;
    setValue(symbol);
    setOpen(false);
    setMatches([]);
    onSubmit(symbol);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (open && active >= 0 && matches[active]) {
      pick(matches[active].symbol);
      return;
    }
    const raw = value.trim();
    if (!raw) return;
    if (/^[A-Za-z0-9.\-^]{1,12}$/.test(raw)) {
      pick(raw.toUpperCase());
    } else if (matches[0]) {
      pick(matches[0].symbol);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div>
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex flex-1 items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
          <Search className="ml-3 size-4 text-muted-foreground" aria-hidden />
          <input
            aria-label="Ticker or company name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => matches.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder="Search ticker or company, e.g. AAPL or Apple"
            className="num w-full bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none"
          />
          {open && matches.length > 0 ? (
            <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-popover py-1 shadow-lg">
              {matches.map((m, i) => (
                <li key={m.symbol}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(m.symbol)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                      i === active ? "bg-accent text-accent-foreground" : "text-foreground"
                    }`}
                  >
                    <span className="truncate">
                      <span className="num font-semibold">{m.symbol}</span>
                      <span className="ml-2 text-muted-foreground">{m.name}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{m.exchange}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
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
            onClick={() => pick(s)}
            className="num rounded border border-border px-1.5 py-0.5 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
