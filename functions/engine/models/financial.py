"""Financial and multi-year aggregation component model."""

from __future__ import annotations

from typing import Sequence

import numpy as np

from engine.state import SimulationState
from utils import safe_float, safe_int


def calc_daily_load_serviced(
    days: Sequence[int] | np.ndarray,
    load_hourly: Sequence[float] | np.ndarray,
    load_not_serviced: Sequence[float] | np.ndarray,
) -> list[float]:
    """Calculate load serviced as `load_hourly - load_not_serviced`."""
    return [float(load_hourly[i] - load_not_serviced[i]) for i in range(len(days))]


def calculate_daily_load(energy_subset_day: Sequence[float] | np.ndarray) -> float:
    """Sum hourly values for a single 24-hour day."""
    return float(sum(energy_subset_day))


def calc_daily_energy(
    length_of_time: int,
    energy_subset_hourly: Sequence[float] | np.ndarray,
) -> list[float]:
    """Average daily energy production/use (24-hour blocks) for graphing."""
    total_hours = len(energy_subset_hourly)
    if total_hours % 24 != 0:
        raise ValueError(f"Must have a multiple of 24 hourly values; got {total_hours}")

    num_days = total_hours // 24
    daily_loads = [0.0] * num_days
    for day in range(num_days):
        start = day * 24
        end = start + 24
        subset_day = energy_subset_hourly[start:end]
        daily_loads[day] = calculate_daily_load(subset_day) / 24.0
    return daily_loads


def predict20years(load: Sequence[float]) -> list[float]:
    """Repeat a 365-day daily series across a 20-year horizon."""
    load20 = [0.0] * (365 * 20)
    for year in range(20):
        start_addr = year * 365
        end_addr = start_addr + 365
        load20[start_addr:end_addr] = load
    return load20


def calculate_20_year_expenses(
    inflation_rate: float,
    capex: float,
    opex: float,
    replacement_cost: float,
    lifespan: int,
    years: int = 20,
) -> np.ndarray:
    """Calculate annual expenses over `years` considering CapEx, OpEx, and inflated replacements."""
    expenses = np.zeros(years, dtype=float)
    expenses[0] = capex
    for year in range(years):
        expenses[year] += opex
        if lifespan and year > 0 and year % lifespan == 0:
            inflated_replacement = replacement_cost * ((1.0 + inflation_rate) ** year)
            expenses[year] += inflated_replacement
    return expenses


def compute_annual_energy(daily_values: Sequence[float] | np.ndarray) -> float:
    """Convert daily average kW values into total annual kWh."""
    return float(np.sum(daily_values) * 24.0)


def normalize_inflation(inflation_raw: float) -> float:
    """Normalize an inflation rate to a decimal value (e.g., 3.0 -> 0.03)."""
    value = float(inflation_raw)
    return value / 100.0 if value > 1.0 else value


def compute_20_year_revenue(
    daily_load_serviced: Sequence[float] | np.ndarray,
    price_per_kwh: float,
    inflation: float,
    years: int = 20,
) -> list[float]:
    """Calculate 20-year annual revenue given daily load serviced, tariff, and inflation."""
    annual_energy = compute_annual_energy(daily_load_serviced)
    price = float(price_per_kwh)
    base_revenue = annual_energy * price
    inflation_rate = normalize_inflation(inflation)
    return [float(base_revenue * ((1.0 + inflation_rate) ** year)) for year in range(years)]


class FinancialModel:
    """Modular Financial and Daily Aggregation component model."""

    def step(self, state: SimulationState) -> None:
        """Compute daily averages, 20-year expenses, and 20-year revenue on `state`."""
        trim = (state.n_rows // 24) * 24
        if trim > 0:
            state.daily_load = calc_daily_energy(0, state.load_values[:trim].tolist())
            state.daily_solar = calc_daily_energy(0, state.solar_power[:trim].tolist())
            state.daily_wind = calc_daily_energy(0, state.wind_power[:trim].tolist())
            state.daily_diesel = calc_daily_energy(0, state.diesel_power[:trim].tolist())
            state.daily_net = calc_daily_energy(0, state.net_energy[:trim].tolist())
            state.daily_lns = calc_daily_energy(0, state.load_not_serviced[:trim].tolist())
            state.daily_load_serviced = calc_daily_energy(
                0, state.hourly_load_serviced[:trim].tolist()
            )

        inflation_raw = safe_float(state.financial_inputs.get("inflation", 3.0), 3.0)
        inflation_rate = normalize_inflation(inflation_raw)

        state.years_arr = np.arange(20)
        state.battery_expenses = np.zeros(20, dtype=float)
        state.generator_expenses = np.zeros(20, dtype=float)
        state.solar_expenses = np.zeros(20, dtype=float)
        state.wind_expenses = np.zeros(20, dtype=float)

        if state.using_battery and state.battery_inputs:
            state.battery_expenses = calculate_20_year_expenses(
                inflation_rate,
                safe_float(state.battery_inputs.get("capex")),
                safe_float(state.battery_inputs.get("opex")),
                safe_float(state.battery_inputs.get("replacement_cost")),
                safe_int(state.battery_inputs.get("lifespan")),
            )
        if state.using_generator and state.generator_inputs:
            state.generator_expenses = calculate_20_year_expenses(
                inflation_rate,
                safe_float(state.generator_inputs.get("capex")),
                safe_float(state.generator_inputs.get("opex")),
                safe_float(state.generator_inputs.get("replacement_cost")),
                safe_int(state.generator_inputs.get("lifespan")),
            )
        if state.using_solar and state.solar_inputs:
            state.solar_expenses = calculate_20_year_expenses(
                inflation_rate,
                safe_float(state.solar_inputs.get("capex")),
                safe_float(state.solar_inputs.get("opex")),
                safe_float(state.solar_inputs.get("replacement_cost")),
                safe_int(state.solar_inputs.get("lifespan")),
            )
        if state.using_wind and state.wind_inputs:
            state.wind_expenses = calculate_20_year_expenses(
                inflation_rate,
                safe_float(state.wind_inputs.get("capex")),
                safe_float(state.wind_inputs.get("opex")),
                safe_float(state.wind_inputs.get("replacement_cost")),
                safe_int(state.wind_inputs.get("lifespan")),
            )

        state.total_expenses = (
            state.battery_expenses
            + state.generator_expenses
            + state.solar_expenses
            + state.wind_expenses
        )
        state.cumulative_expenses = np.cumsum(state.total_expenses)

        energy_price = safe_float(state.financial_inputs.get("energy_price", 0.15), 0.15)
        if (
            state.daily_load_serviced
            and len(state.daily_load_serviced) > 0
            and energy_price > 0
        ):
            state.revenue_yearly = compute_20_year_revenue(
                state.daily_load_serviced,
                energy_price,
                inflation_raw,
            )
            state.cumulative_revenue = [float(v) for v in np.cumsum(state.revenue_yearly)]
        else:
            state.revenue_yearly = None
            state.cumulative_revenue = None
