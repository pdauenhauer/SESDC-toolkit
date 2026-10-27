import { useMemo } from "preact/hooks";
import type { Load } from "../../database/models/load";
import type { Project } from "../../database/models/metadata";
import type { SourceId } from "../ui";
import DemandCard from "./DemandCard";
import { SupplyCard, TypicalDayCard } from "./SupplyCards";
import { totalProfile } from "./model";
import "../../css/workbench-v2.css";

type WorkbenchProps = {
  loads: Load[];
  /** Functional update of the load tree (marks it dirty for the debounced save). */
  onLoadsChange: (updater: (prev: Load[]) => Load[]) => void;
  project: Project | null;
  onToggleSource: (id: SourceId, enabled: boolean) => void;
  onOpenSource: (id: SourceId) => void;
  onEditLoad: (id: string) => void;
};

/** Workbench tab: Demand (loads) on the left, Supply + Typical day on the right. */
export default function Workbench({ loads, onLoadsChange, project, onToggleSource, onOpenSource, onEditLoad }: WorkbenchProps) {
  const demand = useMemo(() => totalProfile(loads), [loads]);
  return (
    <div class="mg-wb" data-screen-label="Workbench">
      <DemandCard
        loads={loads}
        onLoadsChange={onLoadsChange}
        project={project}
        onOpenSource={onOpenSource}
        onEditLoad={onEditLoad}
      />
      <aside class="mg-wb__aside">
        <SupplyCard project={project} onToggleSource={onToggleSource} onOpenSource={onOpenSource} />
        <TypicalDayCard project={project} load={demand} />
      </aside>
    </div>
  );
}
