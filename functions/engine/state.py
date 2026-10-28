"""Central SimulationState object holding Structure-of-Arrays (SoA) time-series, EpochModifiers, and seeded PRNG."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

from contracts import SimulationSummaryKPIs, Tier1SimulationSummaries


@dataclass
class EpochModifiers:
    """Per-epoch (annual) dynamic modifiers controlled by Behavioral Agents and Event Schedulers.

    When all modifier vectors equal 1.0, the simulation reproduces the static baseline.
    Behavioral agents (`Operator_Agent`, `Customer_Agent`), degradation models, and
    `EventScheduler` shocks mutate these vectors across the multi-year horizon without
    requiring changes to component physics kernels.
    """

    horizon_years: int = 20
    solar_derating: np.ndarray = field(default_factory=lambda: np.ones(20, dtype=float))
    wind_derating: np.ndarray = field(default_factory=lambda: np.ones(20, dtype=float))
    battery_soh: np.ndarray = field(default_factory=lambda: np.ones(20, dtype=float))
    load_multiplier: np.ndarray = field(default_factory=lambda: np.ones(20, dtype=float))
    generator_available: np.ndarray = field(default_factory=lambda: np.ones(20, dtype=float))
    dispatch_mode: str = "coupled_load_following"

    @classmethod
    def default(cls, horizon_years: int = 20, dispatch_mode: str = "coupled_load_following") -> "EpochModifiers":
        return cls(
            horizon_years=horizon_years,
            solar_derating=np.ones(horizon_years, dtype=float),
            wind_derating=np.ones(horizon_years, dtype=float),
            battery_soh=np.ones(horizon_years, dtype=float),
            load_multiplier=np.ones(horizon_years, dtype=float),
            generator_available=np.ones(horizon_years, dtype=float),
            dispatch_mode=dispatch_mode,
        )


@dataclass
class SimulationState:
    """Ground-truth state of a simulation run across all timesteps and horizons."""

    nlr_df: pd.DataFrame
    n_rows: int
    time_points: np.ndarray
    load_values: np.ndarray

    using_solar: bool = False
    solar_inputs: dict[str, Any] | None = None
    using_wind: bool = False
    wind_inputs: dict[str, Any] | None = None
    using_generator: bool = False
    generator_inputs: dict[str, Any] | None = None
    using_battery: bool = False
    battery_inputs: dict[str, Any] | None = None
    financial_inputs: dict[str, Any] = field(default_factory=dict)

    # Deterministic seeded PRNG (PCG64) for stochastic events and agent perception
    seed: int = 42
    rng: np.random.Generator = field(default_factory=lambda: np.random.default_rng(42))

    # Multi-year horizon & dynamic agent/event epoch modifiers
    horizon_years: int = 20
    epoch_modifiers: EpochModifiers = field(default_factory=EpochModifiers.default)

    # Hourly time-series (kW / kWh)
    solar_power: np.ndarray = field(default_factory=lambda: np.zeros(0))
    wind_power: np.ndarray = field(default_factory=lambda: np.zeros(0))
    diesel_power: np.ndarray = field(default_factory=lambda: np.zeros(0))
    net_energy: np.ndarray = field(default_factory=lambda: np.zeros(0))
    battery_soc: np.ndarray = field(default_factory=lambda: np.zeros(0))
    load_not_serviced: np.ndarray = field(default_factory=lambda: np.zeros(0))
    hourly_load_serviced: np.ndarray = field(default_factory=lambda: np.zeros(0))
    curtailed_power: np.ndarray = field(default_factory=lambda: np.zeros(0))

    # Daily averages (lists of floats)
    daily_load: list[float] | None = None
    daily_solar: list[float] | None = None
    daily_wind: list[float] | None = None
    daily_diesel: list[float] | None = None
    daily_net: list[float] | None = None
    daily_lns: list[float] | None = None
    daily_load_serviced: list[float] | None = None

    # Multi-year hourly results (MultiYearDispatchModel): one dict of hourly
    # arrays per project year (index 0 = year 1 baseline), plus per-year totals.
    horizon_hourly: list[dict[str, np.ndarray]] | None = None
    yearly_summary: list[dict[str, float]] | None = None

    # 20-year financial arrays
    years_arr: np.ndarray = field(default_factory=lambda: np.arange(20))
    battery_expenses: np.ndarray = field(default_factory=lambda: np.zeros(20))
    generator_expenses: np.ndarray = field(default_factory=lambda: np.zeros(20))
    solar_expenses: np.ndarray = field(default_factory=lambda: np.zeros(20))
    wind_expenses: np.ndarray = field(default_factory=lambda: np.zeros(20))
    total_expenses: np.ndarray = field(default_factory=lambda: np.zeros(20))
    cumulative_expenses: np.ndarray = field(default_factory=lambda: np.zeros(20))
    revenue_yearly: list[float] | None = None
    cumulative_revenue: list[float] | None = None

    # Evaluative summary KPIs and Tier-1 compact JSON summaries
    summary_kpis: SimulationSummaryKPIs | None = None
    tier1_summaries: Tier1SimulationSummaries | None = None

    @classmethod
    def initialize(
        cls,
        nlr_df: pd.DataFrame,
        load_list: list[float] | None,
        using_solar: bool = False,
        solar_inputs: dict[str, Any] | None = None,
        using_wind: bool = False,
        wind_inputs: dict[str, Any] | None = None,
        using_generator: bool = False,
        generator_inputs: dict[str, Any] | None = None,
        using_battery: bool = False,
        battery_inputs: dict[str, Any] | None = None,
        financial_inputs: dict[str, Any] | None = None,
        seed: int = 42,
        horizon_years: int = 20,
        dispatch_mode: str = "coupled_load_following",
    ) -> "SimulationState":
        n_rows = len(nlr_df)
        time_points = np.arange(n_rows)

        if load_list and len(load_list) > 0:
            repeats_needed = (n_rows // len(load_list)) + 1
            repeated = (list(load_list) * repeats_needed)[:n_rows]
        else:
            repeated = [0.0] * n_rows
        load_values = np.array(repeated, dtype=float)

        return cls(
            nlr_df=nlr_df,
            n_rows=n_rows,
            time_points=time_points,
            load_values=load_values,
            using_solar=bool(using_solar),
            solar_inputs=solar_inputs,
            using_wind=bool(using_wind),
            wind_inputs=wind_inputs,
            using_generator=bool(using_generator),
            generator_inputs=generator_inputs,
            using_battery=bool(using_battery),
            battery_inputs=battery_inputs,
            financial_inputs=financial_inputs or {},
            seed=seed,
            rng=np.random.default_rng(seed),
            horizon_years=horizon_years,
            epoch_modifiers=EpochModifiers.default(
                horizon_years=horizon_years,
                dispatch_mode=dispatch_mode,
            ),
            solar_power=np.zeros(n_rows, dtype=float),
            wind_power=np.zeros(n_rows, dtype=float),
            diesel_power=np.zeros(n_rows, dtype=float),
            net_energy=np.zeros(n_rows, dtype=float),
            battery_soc=np.zeros(n_rows, dtype=float),
            load_not_serviced=np.zeros(n_rows, dtype=float),
            hourly_load_serviced=np.zeros(n_rows, dtype=float),
            curtailed_power=np.zeros(n_rows, dtype=float),
        )
