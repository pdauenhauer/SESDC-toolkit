"""Frontend-Backend interface contracts, schemas, and validators.

This module defines the stable data contract between the Preact frontend
(`frontend/src/services/simulation.ts`, `SimulationResults.tsx`,
`SimulationGraphsPanel.tsx`) and the Python backend (`functions/`).
"""

from __future__ import annotations

import csv
import io
from dataclasses import asdict, dataclass, field
from typing import Any

from utils import safe_float, safe_int

CONTRACT_SCHEMA_VERSION = "1.0"

# Canonical dataset keys returned in `csvBundle`
EXPECTED_CSV_KEYS: tuple[str, ...] = (
    "input_data",
    "hourly_simulation",
    "daily_averages",
    "twenty_year_daily",
    "financial_expenses",
    "revenue",
    "solar_heatmap",
    "monthly_heatmap",
)

# Required column headers for each CSV dataset consumed by the frontend
EXPECTED_CSV_COLUMNS: dict[str, list[str]] = {
    "hourly_simulation": [
        "Datetime",
        "load_kW",
        "solar_kW",
        "wind_kW",
        "diesel_kW",
        "net_energy_kW",
        "battery_soc_kWh",
        "load_not_serviced_kW",
        "load_serviced_kW",
    ],
    "daily_averages": [
        "day",
        "avg_load_kW",
        "avg_solar_kW",
        "avg_wind_kW",
        "avg_diesel_kW",
        "avg_net_kW",
        "avg_load_serviced_kW",
        "avg_load_not_serviced_kW",
    ],
    "twenty_year_daily": [
        "day",
        "load_serviced_kW",
    ],
    "financial_expenses": [
        "year",
        "battery_expenses",
        "generator_expenses",
        "solar_expenses",
        "wind_expenses",
        "total_expenses",
        "cumulative_expenses",
    ],
    "revenue": [
        "year",
        "annual_revenue",
        "cumulative_revenue",
    ],
    "solar_heatmap": ["day"] + [f"hour_{h}" for h in range(24)],
    "monthly_heatmap": ["month"] + [f"day_{d + 1}" for d in range(31)],
}


class ContractValidationError(ValueError):
    """Raised when a request payload or response violates the API contract."""


@dataclass(frozen=True)
class SolarInputs:
    losses: list[float]
    solar_array_size: float
    capex: float
    opex: float
    lifespan: int
    replacement_cost: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class WindInputs:
    nameplate_capacity: float
    rated_power: float
    cut_in_speed: float
    rated_speed: float
    cut_out_speed: float
    capex: float
    opex: float
    lifespan: int
    replacement_cost: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class GeneratorInputs:
    capacity: float
    capex: float
    opex: float
    lifespan: int
    replacement_cost: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class BatteryInputs:
    charge_capacity: float
    maximum_storage: float
    battery_type: str
    capex: float
    opex: float
    lifespan: int
    replacement_cost: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class FinancialInputs:
    inflation: float = 3.0
    labor_cost: float = 0.0
    land_leasing_cost: float = 0.0
    licensing_cost: float = 0.0
    other_capex: float = 0.0
    energy_price: float = 0.15

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SimulationSummaryKPIs:
    """High-level evaluative summary metrics for a simulation run."""

    total_load_kwh: float
    total_solar_kwh: float
    total_wind_kwh: float
    total_diesel_kwh: float
    total_load_serviced_kwh: float
    total_load_not_serviced_kwh: float
    unmet_load_fraction: float
    renewable_fraction: float
    total_initial_capex: float
    year_20_cumulative_expenses: float
    year_20_cumulative_revenue: float
    net_20_year_cashflow: float

    def to_dict(self) -> dict[str, float]:
        return asdict(self)


@dataclass(frozen=True)
class Tier1SimulationSummaries:
    """Compact native JSON summaries (< 10 KB) for Firestore & instant frontend charts."""

    financial_expenses_20yr: dict[str, list[float] | list[int]]
    revenue_20yr: dict[str, list[float] | list[int]] | None = None
    monthly_solar_averages: list[float] | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SimulationRequestContract:
    """Validated representation of the frontend `SimulationPayload` JSON body."""

    user_id: str
    project_id: str
    latitude: float | None
    longitude: float | None
    load_inputs: list[float]
    using_solar: bool
    using_wind: bool
    using_generator: bool
    using_battery: bool
    solar_inputs: SolarInputs | None = None
    wind_inputs: WindInputs | None = None
    generator_inputs: GeneratorInputs | None = None
    battery_inputs: BatteryInputs | None = None
    financial_inputs: FinancialInputs = field(default_factory=FinancialInputs)
    seed: int = 42

    @classmethod
    def from_dict(cls, data: Any) -> "SimulationRequestContract":
        if not isinstance(data, dict) or not data:
            raise ContractValidationError("Invalid request: No JSON data provided")

        user_id = data.get("userId")
        project_id = data.get("projectId")
        if not user_id or not project_id or not isinstance(user_id, str) or not isinstance(project_id, str):
            raise ContractValidationError("Missing userId or projectId")

        raw_lat = data.get("latitude")
        raw_lon = data.get("longitude")
        latitude = safe_float(raw_lat) if raw_lat is not None else None
        longitude = safe_float(raw_lon) if raw_lon is not None else None

        raw_loads = data.get("loadInputs", [])
        if raw_loads is None:
            raw_loads = []
        if not isinstance(raw_loads, list):
            raise ContractValidationError("loadInputs must be a list of numbers")
        load_inputs = [safe_float(v, 0.0) for v in raw_loads]

        using_solar = bool(data.get("usingSolarPanel"))
        using_wind = bool(data.get("usingWindTurbine"))
        using_generator = bool(data.get("usingGenerator"))
        using_battery = bool(data.get("usingBattery"))

        solar_inputs = None
        if using_solar:
            losses = [
                safe_float(data.get("wireLosses")) / 100.0,
                safe_float(data.get("moduleMismatch")) / 100.0,
                safe_float(data.get("moduleAging")) / 100.0,
                safe_float(data.get("dustDirt")) / 100.0,
                safe_float(data.get("converter")) / 100.0,
            ]
            solar_inputs = SolarInputs(
                losses=losses,
                solar_array_size=safe_float(data.get("solarArraySize")),
                capex=safe_float(data.get("solarCapex")),
                opex=safe_float(data.get("solarOpex")),
                lifespan=safe_int(data.get("solarLifespan")),
                replacement_cost=safe_float(data.get("solarReplacement")),
            )

        wind_inputs = None
        if using_wind:
            wind_inputs = WindInputs(
                nameplate_capacity=safe_float(data.get("namePlateCapacity")),
                rated_power=safe_float(data.get("ratedPower")),
                cut_in_speed=safe_float(data.get("cutInSpeed")),
                rated_speed=safe_float(data.get("ratedSpeed")),
                cut_out_speed=safe_float(data.get("cutOutSpeed")),
                capex=safe_float(data.get("windCapex")),
                opex=safe_float(data.get("windOpex")),
                lifespan=safe_int(data.get("windLifespan")),
                replacement_cost=safe_float(data.get("windReplacement")),
            )

        generator_inputs = None
        if using_generator:
            generator_inputs = GeneratorInputs(
                capacity=safe_float(data.get("generatorCapacity")),
                capex=safe_float(data.get("generatorCapex")),
                opex=safe_float(data.get("generatorOpex")),
                lifespan=safe_int(data.get("generatorLifespan")),
                replacement_cost=safe_float(data.get("generatorReplacement")),
            )

        battery_inputs = None
        if using_battery:
            battery_inputs = BatteryInputs(
                charge_capacity=safe_float(data.get("chargeCapacity")),
                maximum_storage=safe_float(data.get("maximumStorage")),
                battery_type=str(data.get("batteryType", "lithium-ion") or "lithium-ion"),
                capex=safe_float(data.get("batteryCapex")),
                opex=safe_float(data.get("batteryOpex")),
                lifespan=safe_int(data.get("batteryLifespan")),
                replacement_cost=safe_float(data.get("batteryReplacement")),
            )

        financial_inputs = FinancialInputs(
            inflation=safe_float(data.get("inflation", 3.0), 3.0),
            labor_cost=safe_float(data.get("laborCost")),
            land_leasing_cost=safe_float(data.get("landLeasingCost")),
            licensing_cost=safe_float(data.get("licensingCost")),
            other_capex=safe_float(data.get("otherCapex")),
            energy_price=safe_float(data.get("energyPrice", 0.15), 0.15),
        )

        seed = safe_int(data.get("seed"), default=42)

        return cls(
            user_id=user_id,
            project_id=project_id,
            latitude=latitude,
            longitude=longitude,
            load_inputs=load_inputs,
            using_solar=using_solar,
            using_wind=using_wind,
            using_generator=using_generator,
            using_battery=using_battery,
            solar_inputs=solar_inputs,
            wind_inputs=wind_inputs,
            generator_inputs=generator_inputs,
            battery_inputs=battery_inputs,
            financial_inputs=financial_inputs,
            seed=seed,
        )


@dataclass(frozen=True)
class SimulationResponseContract:
    """Validated response envelope for `POST /run_simulation_post`.

    Guarantees backward-compatible keys (`storagePath`, `csvKeys`, `csvBundle`)
    while supporting additive metadata (`runId`, `summaryKpis`, `tier1Summaries`, `schemaVersion`).
    """

    storage_path: str | None
    csv_bundle: dict[str, str | None]
    run_id: int | None = None
    summary_kpis: SimulationSummaryKPIs | dict[str, float] | None = None
    tier1_summaries: Tier1SimulationSummaries | dict[str, Any] | None = None
    schema_version: str = CONTRACT_SCHEMA_VERSION

    @property
    def csv_keys(self) -> list[str]:
        return [k for k, v in self.csv_bundle.items() if v is not None and len(str(v)) > 0]

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "storagePath": self.storage_path,
            "csvKeys": self.csv_keys,
            "csvBundle": self.csv_bundle,
            "schemaVersion": self.schema_version,
        }
        if self.run_id is not None:
            payload["runId"] = self.run_id
        if self.summary_kpis is not None:
            payload["summaryKpis"] = (
                self.summary_kpis.to_dict()
                if isinstance(self.summary_kpis, SimulationSummaryKPIs)
                else self.summary_kpis
            )
        if self.tier1_summaries is not None:
            payload["tier1Summaries"] = (
                self.tier1_summaries.to_dict()
                if isinstance(self.tier1_summaries, Tier1SimulationSummaries)
                else self.tier1_summaries
            )
        return payload


@dataclass(frozen=True)
class StoredSimulationResponseContract:
    """Validated response envelope for `GET /get_stored_simulation`."""

    csv_bundle: dict[str, str]
    schema_version: str = CONTRACT_SCHEMA_VERSION

    def to_dict(self) -> dict[str, Any]:
        return {
            "csvBundle": self.csv_bundle,
            "schemaVersion": self.schema_version,
        }


def validate_csv_bundle_schema(csv_bundle: dict[str, str | None]) -> None:
    """Validate that `csv_bundle` keys and non-empty CSV headers conform to the frontend contract.

    Raises `ContractValidationError` if any unexpected key is present or if any
    non-empty CSV is missing required column headers.
    """
    if not isinstance(csv_bundle, dict):
        raise ContractValidationError("csvBundle must be a dictionary")

    missing_keys = [k for k in EXPECTED_CSV_KEYS if k not in csv_bundle]
    if missing_keys:
        raise ContractValidationError(f"csvBundle is missing expected keys: {missing_keys}")

    for key, csv_str in csv_bundle.items():
        if csv_str is None:
            continue
        if not isinstance(csv_str, str) or not csv_str.strip():
            raise ContractValidationError(f"CSV entry '{key}' must be a non-empty string or None")

        reader = csv.reader(io.StringIO(csv_str))
        try:
            header = next(reader)
        except StopIteration as exc:
            raise ContractValidationError(f"CSV entry '{key}' has no header row") from exc

        expected_cols = EXPECTED_CSV_COLUMNS.get(key)
        if expected_cols is not None and header != expected_cols:
            raise ContractValidationError(
                f"CSV '{key}' header mismatch: expected {expected_cols}, got {header}"
            )
        elif key == "input_data" and "load_values" not in header:
            raise ContractValidationError(
                f"CSV 'input_data' must include 'load_values' column, got {header}"
            )
