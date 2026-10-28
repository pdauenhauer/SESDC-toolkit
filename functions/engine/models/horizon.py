"""Multi-year (20-year) hourly simulation on top of `EpochModifiers`.

`DegradationModel` writes asset ageing into the per-year modifier vectors, and
`MultiYearDispatchModel` re-runs the coupled dispatch kernel for every project
year with those modifiers applied. Year 1 is the baseline run produced by
`CoupledDispatchModel` (all modifiers are 1.0 in year 1), so `hourly_simulation`
is unchanged; years 2-20 are added as `hourly_year_02` ... `hourly_year_20`.
"""

from __future__ import annotations

import numpy as np

from engine.models.dispatch import dispatch_parameters, run_coupled_dispatch_kernel
from engine.models.generator import net_energy_for_graph
from engine.state import SimulationState
from utils import safe_float

# Annual performance decline. Each asset's age resets when it is replaced at the
# end of its lifespan.
SOLAR_DEGRADATION_PER_YEAR = 0.005  # ~0.5%/yr panel output decline (industry standard)
BATTERY_DEGRADATION_PER_YEAR = 0.015  # ~1.5%/yr usable-capacity fade

# Typical gensets burn ~0.28-0.33 L/kWh near rated load.
DIESEL_LITERS_PER_KWH = 0.30


def asset_age(year: int, lifespan: float) -> int:
    """Years since the asset was installed or last replaced (0-based `year`)."""
    life = int(lifespan) if lifespan and lifespan > 0 else 0
    return year % life if life > 0 else year


def degradation_factor(rate: float, year: int, lifespan: float) -> float:
    """Remaining performance fraction in `year` (0-based), resetting at each replacement."""
    return (1.0 - rate) ** asset_age(year, lifespan)


class DegradationModel:
    """Applies solar output decline and battery capacity fade to `EpochModifiers`.

    Multiplies into the existing vectors (rather than overwriting) so agents and
    events that also adjust `solar_derating` / `battery_soh` compose with it.
    Year 1 (index 0) is always 1.0, so the baseline run is unaffected.
    """

    def step(self, state: SimulationState) -> None:
        mods = state.epoch_modifiers
        solar_life = safe_float((state.solar_inputs or {}).get("lifespan"))
        battery_life = safe_float((state.battery_inputs or {}).get("lifespan"))
        for y in range(mods.horizon_years):
            mods.solar_derating[y] *= degradation_factor(SOLAR_DEGRADATION_PER_YEAR, y, solar_life)
            mods.battery_soh[y] *= degradation_factor(BATTERY_DEGRADATION_PER_YEAR, y, battery_life)


def _battery_discharge(soc: np.ndarray, soc_start: float) -> np.ndarray:
    """Hourly kW drawn from the battery, from drops in state of charge."""
    prev = np.concatenate(([soc_start], soc[:-1]))
    return np.maximum(prev - soc, 0.0)


class MultiYearDispatchModel:
    """Re-dispatches every project year with that year's `EpochModifiers`.

    Fills `state.horizon_hourly` (one dict of hourly arrays per year, year 1 being
    the baseline arrays) and `state.yearly_summary` (one row of totals per year).
    State of charge carries over from the end of one year into the next.
    Only runs in the coupled dispatch mode.
    """

    def step(self, state: SimulationState) -> None:
        if state.epoch_modifiers.dispatch_mode != "coupled_load_following":
            state.horizon_hourly = None
            state.yearly_summary = None
            return

        mods = state.epoch_modifiers
        p = dispatch_parameters(state)
        load_base = np.asarray(state.load_values, dtype=np.float64)
        solar_base = np.asarray(state.solar_power, dtype=np.float64)
        wind_base = np.asarray(state.wind_power, dtype=np.float64)
        min_fraction = p["batt_min_kwh"] / p["batt_max_kwh"] if p["batt_max_kwh"] > 0 else 0.0

        years: list[dict[str, np.ndarray]] = []
        summary: list[dict[str, float]] = []
        soc_end = p["initial_soc"]

        for y in range(mods.horizon_years):
            max_kwh = p["batt_max_kwh"] * float(mods.battery_soh[y])
            min_kwh = min_fraction * max_kwh
            soc_start = min(max(soc_end, min_kwh), max_kwh) if p["using_battery"] else 0.0
            if y == 0:
                # The baseline run from CoupledDispatchModel is year 1.
                hourly = {
                    "load": load_base,
                    "solar": solar_base,
                    "wind": wind_base,
                    "diesel": np.asarray(state.diesel_power, dtype=np.float64),
                    "soc": np.asarray(state.battery_soc, dtype=np.float64),
                    "unmet": np.asarray(state.load_not_serviced, dtype=np.float64),
                    "served": np.asarray(state.hourly_load_serviced, dtype=np.float64),
                    "net": np.asarray(state.net_energy, dtype=np.float64),
                    "curtailed": np.asarray(state.curtailed_power, dtype=np.float64),
                }
                soc_start = p["initial_soc"]
            else:
                load = load_base * float(mods.load_multiplier[y])
                solar = solar_base * float(mods.solar_derating[y])
                wind = wind_base * float(mods.wind_derating[y])
                diesel, soc, unmet, curtailed, _ = run_coupled_dispatch_kernel(
                    load,
                    solar,
                    wind,
                    p["using_battery"],
                    float(p["batt_power_cap_kw"]),
                    float(max_kwh),
                    float(min_kwh),
                    float(soc_start),
                    p["using_generator"],
                    float(p["max_diesel_kw"] * float(mods.generator_available[y])),
                )
                hourly = {
                    "load": load,
                    "solar": solar,
                    "wind": wind,
                    "diesel": diesel,
                    "soc": soc,
                    "unmet": unmet,
                    "served": load - unmet,
                    "net": np.asarray(net_energy_for_graph(solar, load, wind, diesel), dtype=np.float64),
                    "curtailed": curtailed,
                }
            soc_end = float(hourly["soc"][-1]) if len(hourly["soc"]) else soc_start
            discharge = _battery_discharge(hourly["soc"], soc_start) if p["using_battery"] else np.zeros_like(load_base)
            years.append(hourly)

            diesel_kwh = float(np.sum(hourly["diesel"]))
            summary.append({
                "year": y + 1,
                "load_kWh": float(np.sum(hourly["load"])),
                "solar_kWh": float(np.sum(hourly["solar"])),
                "wind_kWh": float(np.sum(hourly["wind"])),
                "battery_discharge_kWh": float(np.sum(discharge)),
                "diesel_kWh": diesel_kwh,
                "unmet_kWh": float(np.sum(hourly["unmet"])),
                "served_kWh": float(np.sum(hourly["served"])),
                "excess_kWh": float(np.sum(hourly["curtailed"])),
                "fuel_liters": diesel_kwh * DIESEL_LITERS_PER_KWH,
                "battery_usable_kWh": max_kwh if p["using_battery"] else 0.0,
                "solar_output_factor": float(mods.solar_derating[y]),
            })

        state.horizon_hourly = years
        state.yearly_summary = summary
