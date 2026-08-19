import type { Assumptions, TerminalMethod } from "@/lib/dcf";
import { computeWacc, fmtPct } from "@/lib/dcf";
import { NumberField, PercentField, Section, ToggleGroup } from "./fields";

type Props = {
  a: Assumptions;
  onChange: (patch: Partial<Assumptions>) => void;
  onReset: () => void;
};

export function AssumptionsPanel({ a, onChange, onReset }: Props) {
  const wacc = computeWacc(a);
  const costOfEquity = a.riskFreeRate + a.beta * a.equityRiskPremium;

  return (
    <div className="space-y-4">
      <Section title="Operating assumptions">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <ToggleGroup
            label="Forecast horizon"
            value={String(a.horizon)}
            options={[
              { value: "5", label: "5 years" },
              { value: "10", label: "10 years" },
            ]}
            onChange={(v) => onChange({ horizon: Number(v) })}
          />
          <ToggleGroup
            label="Growth path"
            value={a.fadeToTerminal ? "fade" : "flat"}
            options={[
              { value: "fade", label: "Fade to terminal" },
              { value: "flat", label: "Flat" },
            ]}
            onChange={(v) => onChange({ fadeToTerminal: v === "fade" })}
          />
          <button
            type="button"
            onClick={onReset}
            className="ml-auto rounded-md border border-input px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Recalculate from history
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <PercentField label="Year 1 revenue growth" value={a.startGrowth} onChange={(v) => onChange({ startGrowth: v })} />
          <PercentField label="EBIT margin" value={a.ebitMargin} onChange={(v) => onChange({ ebitMargin: v })} />
          <PercentField label="Effective tax rate" value={a.taxRate} onChange={(v) => onChange({ taxRate: v })} />
          <PercentField label="D&A (% revenue)" value={a.daPct} onChange={(v) => onChange({ daPct: v })} />
          <PercentField label="Capex (% revenue)" value={a.capexPct} onChange={(v) => onChange({ capexPct: v })} />
          <PercentField label="Δ NWC (% of Δ revenue)" value={a.nwcPct} onChange={(v) => onChange({ nwcPct: v })} />
        </div>
      </Section>

      <Section title="Discount rate (WACC build-up)">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <PercentField label="Risk-free rate" value={a.riskFreeRate} onChange={(v) => onChange({ riskFreeRate: v })} />
          <PercentField label="Equity risk premium" value={a.equityRiskPremium} onChange={(v) => onChange({ equityRiskPremium: v })} />
          <NumberField label="Beta" value={a.beta} step={0.05} onChange={(v) => onChange({ beta: v })} />
          <PercentField label="Pre-tax cost of debt" value={a.costOfDebt} onChange={(v) => onChange({ costOfDebt: v })} />
          <PercentField label="Debt weight (D / D+E)" value={a.debtWeight} onChange={(v) => onChange({ debtWeight: v })} />
          <PercentField
            label="WACC override"
            value={a.waccOverride ?? wacc}
            onChange={(v) => onChange({ waccOverride: v })}
            hint={a.waccOverride !== null ? "Override active" : "Computed from build-up"}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>
            Cost of equity <span className="num text-foreground">{fmtPct(costOfEquity)}</span>
          </span>
          <span>
            After-tax cost of debt <span className="num text-foreground">{fmtPct(a.costOfDebt * (1 - a.taxRate))}</span>
          </span>
          <span>
            WACC <span className="num font-semibold text-primary">{fmtPct(wacc, 2)}</span>
          </span>
          {a.waccOverride !== null && (
            <button
              type="button"
              onClick={() => onChange({ waccOverride: null })}
              className="rounded border border-input px-2 py-1 text-[11px] hover:text-foreground"
            >
              Clear override
            </button>
          )}
        </div>
      </Section>

      <Section title="Terminal value">
        <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-3">
          <ToggleGroup<TerminalMethod>
            label="Method"
            value={a.terminalMethod}
            options={[
              { value: "perpetuity", label: "Perpetuity growth" },
              { value: "exit-multiple", label: "Exit multiple" },
            ]}
            onChange={(v) => onChange({ terminalMethod: v })}
          />
          <PercentField label="Terminal growth" value={a.terminalGrowth} onChange={(v) => onChange({ terminalGrowth: v })} />
          <NumberField label="Exit EV/EBITDA" value={a.exitMultiple} step={0.5} suffix="x" onChange={(v) => onChange({ exitMultiple: v })} />
        </div>
      </Section>
    </div>
  );
}
