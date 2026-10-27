"""Central SimulationState object holding Structure-of-Arrays (SoA) time-series and seeded PRNG."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

from contracts import SimulationSummaryKPIs, Tier1SimulationSummaries


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

    # Hourly time-series (kW / kWh)
    solar_power: np.ndarray = field(default_factory=lambda: np.zeros(0))
    wind_power: np.ndarray = field(default_factory=lambda: np.zeros(0))
    diesel_power: np.ndarray = field(default_factory=lambda: np.zeros(0))
    net_energy: np.ndarray = field(default_factory=lambda: np.zeros(0))
    battery_soc: np.ndarray = field(default_factory=lambda: np.zeros(0))
    load_not_serviced: np.ndarray = field(default_factory=lambda: np.zeros(0))
    hourly_load_serviced: np.ndarray = field(default_factory=lambda: np.zeros(0))

    # Daily averages (lists of floats)
    daily_load: list[float] | None = None
    daily_solar: list[float] | None = None
    daily_wind: list[float] | None = None
    daily_diesel: list[float] | None = None
    daily_net: list[float] | None = None
    daily_lns: list[float] | None = None
    daily_load_serviced: list[float] | None = None

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
            solar_power=np.zeros(n_rows, dtype=float),
            wind_power=np.zeros(n_rows, dtype=float),
            diesel_power=np.zeros(n_rows, dtype=float),
            net_energy=np.zeros(n_rows, dtype=float),
            battery_soc=np.zeros(n_rows, dtype=float),
            load_not_serviced=np.zeros(n_rows, dtype=float),
            hourly_load_serviced=np.zeros(n_rows, dtype=float),
        )
