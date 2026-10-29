"""Deterministic TypeScript declaration generator for `functions/contracts.py`.

Exports `contracts/simulation-contracts.d.ts` using only Python stdlib so frontend
developers and AI coding agents (e.g., VS Code + Claude, Zed + Argon) always have an
exact, machine-verified TypeScript mirror of backend HTTP payloads, summary KPIs,
Tier-1 Firestore schemas, and CSV column headers—without touching `frontend/**`.

Usage:
    python functions/contract_export.py --write
"""

from __future__ import annotations

import argparse
import dataclasses
import sys
from pathlib import Path

FUNCTIONS_DIR = Path(__file__).resolve().parent
REPO_ROOT = FUNCTIONS_DIR.parent
if str(FUNCTIONS_DIR) not in sys.path:
    sys.path.insert(0, str(FUNCTIONS_DIR))

from contracts import (  # noqa: E402
    CONTRACT_SCHEMA_VERSION,
    EXPECTED_CSV_COLUMNS,
    EXPECTED_CSV_KEYS,
    ON_DEMAND_CSV_PREFIX,
    SimulationSummaryKPIs,
    Tier1SimulationSummaries,
)

DEFAULT_OUTPUT_PATH = REPO_ROOT / "contracts" / "simulation-contracts.d.ts"


def _ts_type_for_kpi_field(py_type: str) -> str:
    if py_type in ("float", "int"):
        return "number"
    if py_type == "bool":
        return "boolean"
    if py_type == "str":
        return "string"
    return "unknown"


def render_typescript_contracts() -> str:
    """Render deterministic `.d.ts` content mirroring `functions/contracts.py`."""
    lines: list[str] = [
        "// AUTO-GENERATED FROM `functions/contracts.py` VIA `functions/contract_export.py`.",
        "// DO NOT EDIT MANUALLY — enforced by `functions/tests/test_contracts.py`.",
        "// Regenerate with: `python functions/contract_export.py --write`",
        "",
        f'export type ContractSchemaVersion = "{CONTRACT_SCHEMA_VERSION}";',
        "",
        "// Canonical CSV bundle keys returned by default in `SimulationResponseEnvelope.csvBundle`",
        "export type DefaultCsvKey =",
    ]
    for idx, key in enumerate(EXPECTED_CSV_KEYS):
        suffix = ";" if idx == len(EXPECTED_CSV_KEYS) - 1 else ""
        lines.append(f'  | "{key}"{suffix}')

    lines.extend(
        [
            "",
            f'// Years 2..20 on-demand hourly CSV keys (`{ON_DEMAND_CSV_PREFIX}02` .. `{ON_DEMAND_CSV_PREFIX}20`), fetched via `?keys=`',
            "export type OnDemandHourlyYearKey =",
        ]
    )
    year_keys = [f"{ON_DEMAND_CSV_PREFIX}{yr:02d}" for yr in range(2, 21)]
    for idx, yk in enumerate(year_keys):
        suffix = ";" if idx == len(year_keys) - 1 else ""
        lines.append(f'  | "{yk}"{suffix}')

    lines.extend(
        [
            "",
            "export type AnySimulationCsvKey = DefaultCsvKey | OnDemandHourlyYearKey;",
            "",
            "// Exact required CSV column header tuples validated by `validate_csv_bundle_schema()`",
            "export interface ExpectedCsvColumnsMap {",
        ]
    )
    for table_key, cols in EXPECTED_CSV_COLUMNS.items():
        cols_union = ", ".join(f'"{c}"' for c in cols)
        lines.append(f"  readonly {table_key}: readonly [{cols_union}];")
    lines.extend(
        [
            "}",
            "",
            "// High-level evaluative summary metrics (`SimulationSummaryKPIs`)",
            "export interface SimulationSummaryKPIs {",
        ]
    )
    for f in dataclasses.fields(SimulationSummaryKPIs):
        ts_t = _ts_type_for_kpi_field(str(f.type))
        lines.append(f"  readonly {f.name}: {ts_t};")
    lines.extend(
        [
            "}",
            "",
            "// Compact native JSON summaries (< 15 KB) stored in Firestore & returned in `tier1Summaries`",
            "export interface Tier1SimulationSummaries {",
        ]
    )
    for f in dataclasses.fields(Tier1SimulationSummaries):
        if f.name == "financial_expenses_20yr":
            lines.append("  readonly financial_expenses_20yr: Record<string, number[]>;")
        elif f.name == "revenue_20yr":
            lines.append("  readonly revenue_20yr?: Record<string, number[]> | null;")
        elif f.name == "monthly_solar_averages":
            lines.append("  readonly monthly_solar_averages?: number[] | null;")
        else:
            lines.append(f"  readonly {f.name}?: unknown;")
    lines.extend(
        [
            "}",
            "",
            "// Request JSON body accepted by `POST /run_simulation_post`",
            "// Requires HTTP header: `Authorization: Bearer <Firebase ID Token matching userId>`",
            "export interface SimulationRequestPayload {",
            "  userId: string;",
            "  projectId: string;",
            "  latitude?: number | null;",
            "  longitude?: number | null;",
            "  loadInputs?: number[];",
            "  usingSolarPanel?: boolean;",
            "  usingWindTurbine?: boolean;",
            "  usingGenerator?: boolean;",
            "  usingBattery?: boolean;",
            "  // Solar inputs (used when `usingSolarPanel` is true; losses sent as 0..100 percentages)",
            "  wireLosses?: number;",
            "  moduleMismatch?: number;",
            "  moduleAging?: number;",
            "  dustDirt?: number;",
            "  converter?: number;",
            "  solarArraySize?: number;",
            "  solarCapex?: number;",
            "  solarOpex?: number;",
            "  solarLifespan?: number;",
            "  solarReplacement?: number;",
            "  // Wind inputs (used when `usingWindTurbine` is true)",
            "  namePlateCapacity?: number;",
            "  ratedPower?: number;",
            "  cutInSpeed?: number;",
            "  ratedSpeed?: number;",
            "  cutOutSpeed?: number;",
            "  windCapex?: number;",
            "  windOpex?: number;",
            "  windLifespan?: number;",
            "  windReplacement?: number;",
            "  // Diesel generator inputs (used when `usingGenerator` is true)",
            "  generatorCapacity?: number;",
            "  generatorCapex?: number;",
            "  generatorOpex?: number;",
            "  generatorLifespan?: number;",
            "  generatorReplacement?: number;",
            "  // Battery storage inputs (used when `usingBattery` is true)",
            '  batteryType?: "lithium-ion" | "lead-acid" | string;',
            "  chargeCapacity?: number;",
            "  maximumStorage?: number;",
            "  batteryCapex?: number;",
            "  batteryOpex?: number;",
            "  batteryLifespan?: number;",
            "  batteryReplacement?: number;",
            "  // Project financial & stochastic parameters",
            "  inflation?: number;",
            "  laborCost?: number;",
            "  landLeasingCost?: number;",
            "  licensingCost?: number;",
            "  otherCapex?: number;",
            "  energyPrice?: number;",
            "  seed?: number;",
            "}",
            "",
            "// Validated response envelope returned by `POST /run_simulation_post` (`SimulationResponseContract`)",
            "export interface SimulationResponseEnvelope {",
            "  readonly storagePath: string | null;",
            "  readonly csvKeys: AnySimulationCsvKey[];",
            "  readonly csvBundle: Partial<Record<DefaultCsvKey, string | null>>;",
            "  readonly schemaVersion: ContractSchemaVersion;",
            "  readonly runId?: number;",
            "  readonly summaryKpis?: SimulationSummaryKPIs;",
            "  readonly tier1Summaries?: Tier1SimulationSummaries;",
            "}",
            "",
            "// Validated response envelope returned by `GET /get_stored_simulation?userId=...&projectId=...&keys=...`",
            "// Requires HTTP header: `Authorization: Bearer <Firebase ID Token matching userId>`",
            "export interface StoredSimulationResponseEnvelope {",
            "  readonly csvBundle: Partial<Record<AnySimulationCsvKey, string>>;",
            "  readonly schemaVersion: ContractSchemaVersion;",
            "}",
            "",
        ]
    )
    return "\n".join(lines)


def write_typescript_contracts(output_path: Path = DEFAULT_OUTPUT_PATH) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(render_typescript_contracts(), encoding="utf-8", newline="\n")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Export TypeScript contract declarations.")
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write `contracts/simulation-contracts.d.ts` to disk.",
    )
    args = parser.parse_args()
    if args.write:
        path = write_typescript_contracts()
        print(f"Wrote {path.relative_to(REPO_ROOT)}")
    else:
        sys.stdout.write(render_typescript_contracts())


if __name__ == "__main__":
    main()
