import type { WalletRankingDto } from "@polyand/types";

const COMPONENT_LABELS: Record<keyof WalletRankingDto["components"], string> = {
  simulatedRoi: "Simulated copy ROI",
  realizedRoi: "Realized ROI",
  drawdown: "Drawdown",
  consistency: "Consistency",
  recentPerformance: "Recent performance",
  liquidity: "Liquidity compat.",
  dataConfidence: "Data confidence",
  activity: "Activity cadence",
  delayTolerance: "Delay tolerance",
  oversizedRisk: "Oversized-trade risk",
  categoryFocus: "Category focus"
};

const CLASSIFICATION_TONE: Record<WalletRankingDto["classification"], string> = {
  "Prime copy candidate": "bg-profit-soft text-profit-edge border-profit-edge",
  "Strong copy candidate": "bg-profit-soft text-profit-edge border-profit-edge",
  "Watchlist candidate": "bg-signal-soft text-signal border-signal",
  "High-risk candidate": "bg-loss-soft text-loss-edge border-loss-edge",
  "Avoid copying": "bg-loss-soft text-loss-edge border-loss-edge"
};

export function CopyabilityCard({ ranking }: { ranking: WalletRankingDto | null }) {
  if (!ranking) {
    return (
      <div className="px-4 py-6 text-sm text-slate-500">
        No ranking available yet. Refresh the wallet to compute its copyability score.
      </div>
    );
  }

  const components = Object.entries(ranking.components) as Array<
    [keyof WalletRankingDto["components"], WalletRankingDto["components"][keyof WalletRankingDto["components"]]]
  >;

  return (
    <div className="grid gap-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-4xl font-semibold text-ink">{ranking.finalScore}</div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${CLASSIFICATION_TONE[ranking.classification]}`}>
          {ranking.classification}
        </span>
        <span className="text-xs text-slate-500">weights {ranking.weightsVersion}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {components.map(([key, component]) => (
          <div key={key} className="flex items-center justify-between rounded-md border border-line bg-white px-3 py-2 text-sm">
            <div className="flex flex-col">
              <span className="text-ink">{COMPONENT_LABELS[key]}</span>
              <span className="text-xs text-slate-400">weight {component.weight}%{component.detail ? ` · ${component.detail}` : ""}</span>
            </div>
            <ScoreBar score={component.score} />
          </div>
        ))}
      </div>

      {ranking.warnings.length > 0 ? (
        <div className="grid gap-2">
          {ranking.warnings.map((warning) => (
            <div
              key={warning.code}
              className={`rounded-md border px-3 py-2 text-xs ${
                warning.severity === "critical"
                  ? "border-loss-edge bg-loss-soft text-loss-edge"
                  : warning.severity === "warning"
                    ? "border-signal bg-signal-soft text-signal"
                    : "border-line bg-panel text-slate-600"
              }`}
            >
              <span className="font-medium">{warning.code}</span>: {warning.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-xs text-slate-400">n/a</span>;
  }
  const tone = score >= 70 ? "bg-profit-edge" : score >= 40 ? "bg-signal" : "bg-loss-edge";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-panel">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.max(2, score)}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-medium text-ink">{score}</span>
    </div>
  );
}
