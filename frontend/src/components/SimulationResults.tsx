import { useState } from "preact/hooks";
import type { SimulationResult } from "../services/simulation";
import "../css/simulation-results.css";

const PREVIEW_LINES = 15;
const LABELS: Record<string, string> = {
  input_data: "Input data (NREL + load)",
  hourly_simulation: "Hourly simulation",
  daily_averages: "Daily averages",
  twenty_year_daily: "20-year daily load serviced",
  financial_expenses: "Financial expenses (20y)",
  revenue: "Revenue (20y)",
  solar_heatmap: "Solar heatmap (365 x 24)",
  monthly_heatmap: "Monthly heatmap (12 x 31)",
};

interface SimulationResultsProps {
  result: SimulationResult;
  onClear?: () => void;
}

export default function SimulationResults({ result, onClear }: SimulationResultsProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const entries = Object.entries(result).filter(
    ([, csv]) => csv != null && csv.length > 0
  );

  if (entries.length === 0) {
    return (
      <div class="simulation-results simulation-results--empty">
        <p>No result data to display.</p>
        {onClear && (
          <button type="button" class="simulation-results-clear" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
    );
  }

  return (
    <div class="simulation-results">
      <div class="simulation-results-header">
        <h3 class="simulation-results-title">Simulation outputs</h3>
        {onClear && (
          <button type="button" class="simulation-results-clear" onClick={onClear}>
            Clear results
          </button>
        )}
      </div>

      <ul class="simulation-results-list">
        {entries.map(([key, csv]) => {
          const label = LABELS[key] ?? key;
          const lines = csv.split(/\r?\n/).filter(Boolean);
          const preview = lines.slice(0, PREVIEW_LINES).join("\n");
          const isExpanded = expandedKey === key;

          const download = () => {
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `simulation_${key}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
          };

          return (
            <li key={key} class="simulation-results-item">
              <div class="simulation-results-item-header">
                <button
                  type="button"
                  class="simulation-results-item-toggle"
                  onClick={() => setExpandedKey(isExpanded ? null : key)}
                  aria-expanded={isExpanded}
                >
                  <span class="simulation-results-item-label">{label}</span>
                  <span class="simulation-results-item-meta">
                    {lines.length} rows
                  </span>
                </button>
                <button
                  type="button"
                  class="simulation-results-download"
                  onClick={download}
                >
                  Download CSV
                </button>
              </div>
              {isExpanded && (
                <pre class="simulation-results-preview">{preview}</pre>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
