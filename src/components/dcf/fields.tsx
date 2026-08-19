import type { ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <h2 className="border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  hint?: string;
};

/** Percent input: state is a fraction (0.08), UI shows 8.0 */
export function PercentField({ label, value, onChange, step = 0.1, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? Number((value * 100).toFixed(2)) : 0}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="num w-full bg-transparent px-2.5 py-1.5 text-sm text-foreground outline-none"
        />
        <span className="num pr-2.5 text-xs text-muted-foreground">%</span>
      </div>
      {hint ? <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function NumberField({ label, value, onChange, step = 0.1, suffix, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? Number(value.toFixed(4)) : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="num w-full bg-transparent px-2.5 py-1.5 text-sm text-foreground outline-none"
        />
        {suffix ? <span className="num pr-2.5 text-xs text-muted-foreground">{suffix}</span> : null}
      </div>
      {hint ? <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <div className="inline-flex rounded-md border border-input p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded px-2.5 py-1 text-xs transition-colors ${
              value === o.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
