import type { Load } from "../database/models/load";
import type { SimulationResult } from "../services/simulation";
import Workbench from "./Workbench";
import SimulationResults from "./SimulationResults";

export type CraftTabId = "data" | "workbench" | "graphs";

const TABS: { id: CraftTabId; label: string }[] = [
  { id: "data", label: "Data" },
  { id: "workbench", label: "Workbench" },
  { id: "graphs", label: "Graphs" },
];

interface ProjectCraftAreaProps {
  activeTab: CraftTabId;
  onTabChange: (tab: CraftTabId) => void;
  workbenchLoads: Load[];
  setWorkbenchLoads: (value: Load[] | ((prev: Load[]) => Load[])) => void;
  simulationResult?: SimulationResult | null;
  onClearSimulationResult?: () => void;
  dataTabLoading?: boolean;
}

export default function ProjectCraftArea({
  activeTab,
  onTabChange,
  workbenchLoads,
  setWorkbenchLoads,
  simulationResult = null,
  onClearSimulationResult,
  dataTabLoading = false,
}: ProjectCraftAreaProps) {
  return (
    <div class="project-craft-area">
      <div class="project-craft-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            class={[
              "project-craft-tab",
              activeTab === tab.id ? "is-active" : "",
            ].join(" ")}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div class="project-craft-content">
        {activeTab === "data" && (
          <div class="project-craft-panel">
            {dataTabLoading ? (
              <p class="project-craft-placeholder project-craft-placeholder--loading">
                Loading stored data…
              </p>
            ) : simulationResult && Object.keys(simulationResult).length > 0 ? (
              <SimulationResults
                result={simulationResult}
                onClear={onClearSimulationResult}
              />
            ) : (
              <p class="project-craft-placeholder">
                Data — run a simulation from the toolbar to see CSV results here.
              </p>
            )}
          </div>
        )}
        {activeTab === "workbench" && (
          <div class="project-craft-panel">
            <Workbench loads={workbenchLoads} setLoads={setWorkbenchLoads} />
          </div>
        )}
        {activeTab === "graphs" && (
          <div class="project-craft-panel">
            <p class="project-craft-placeholder">Graphs — simulation charts and visualizations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
