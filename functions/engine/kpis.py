"""Evaluative KPI and Tier-1 summary calculations synthesized from `SimulationState`."""

from __future__ import annotations

from typing import Any

import numpy as np

from contracts import SimulationSummaryKPIs, Tier1SimulationSummaries
from engine.state import SimulationState
from utils import safe_float


def compute_summary_kpis(state: SimulationState) -> SimulationSummaryKPIs:
    """Synthesize high-level energy and financial KPIs from a completed `SimulationState`."""
    total_load_kwh = float(np.sum(state.load_values))
    total_solar_kwh = float(np.sum(state.solar_power))
    total_wind_kwh = float(np.sum(state.wind_power))
    total_diesel_kwh = float(np.sum(state.diesel_power))
    total_load_serviced_kwh = float(np.sum(state.hourly_load_serviced))
    total_load_not_serviced_kwh = float(np.sum(state.load_not_serviced))

    unmet_load_fraction = (
        total_load_not_serviced_kwh / total_load_kwh if total_load_kwh > 0.0 else 0.0
    )

    total_generation_kwh = total_solar_kwh + total_wind_kwh + total_diesel_kwh
    renewable_generation_kwh = total_solar_kwh + total_wind_kwh
    renewable_fraction = (
        renewable_generation_kwh / total_generation_kwh if total_generation_kwh > 0.0 else 0.0
    )

    total_initial_capex = 0.0
    if state.using_solar and state.solar_inputs:
        total_initial_capex += safe_float(state.solar_inputs.get("capex"))
    if state.using_wind and state.wind_inputs:
        total_initial_capex += safe_float(state.wind_inputs.get("capex"))
    if state.using_generator and state.generator_inputs:
        total_initial_capex += safe_float(state.generator_inputs.get("capex"))
    if state.using_battery and state.battery_inputs:
        total_initial_capex += safe_float(state.battery_inputs.get("capex"))

    year_20_cumulative_expenses = (
        float(state.cumulative_expenses[-1]) if len(state.cumulative_expenses) > 0 else 0.0
    )
    year_20_cumulative_revenue = (
        float(state.cumulative_revenue[-1])
        if state.cumulative_revenue and len(state.cumulative_revenue) > 0
        else 0.0
    )
    net_20_year_cashflow = year_20_cumulative_revenue - year_20_cumulative_expenses

    return SimulationSummaryKPIs(
        total_load_kwh=round(total_load_kwh, 4),
        total_solar_kwh=round(total_solar_kwh, 4),
        total_wind_kwh=round(total_wind_kwh, 4),
        total_diesel_kwh=round(total_diesel_kwh, 4),
        total_load_serviced_kwh=round(total_load_serviced_kwh, 4),
        total_load_not_serviced_kwh=round(total_load_not_serviced_kwh, 4),
        unmet_load_fraction=round(unmet_load_fraction, 6),
        renewable_fraction=round(renewable_fraction, 6),
        total_initial_capex=round(total_initial_capex, 2),
        year_20_cumulative_expenses=round(year_20_cumulative_expenses, 2),
        year_20_cumulative_revenue=round(year_20_cumulative_revenue, 2),
        net_20_year_cashflow=round(net_20_year_cashflow, 2),
    )


def compute_tier1_summaries(state: SimulationState) -> Tier1SimulationSummaries:
    """Build compact Tier-1 JSON summary series (< 10 KB) for Firestore & instant rendering."""
    fin_20yr: dict[str, list[float] | list[int]] = {
        "year": [int(y) for y in state.years_arr.tolist()],
        "battery_expenses": [round(float(v), 2) for v in state.battery_expenses.tolist()],
        "generator_expenses": [round(float(v), 2) for v in state.generator_expenses.tolist()],
        "solar_expenses": [round(float(v), 2) for v in state.solar_expenses.tolist()],
        "wind_expenses": [round(float(v), 2) for v in state.wind_expenses.tolist()],
        "total_expenses": [round(float(v), 2) for v in state.total_expenses.tolist()],
        "cumulative_expenses": [round(float(v), 2) for v in state.cumulative_expenses.tolist()],
    }

    rev_20yr: dict[str, list[float] | list[int]] | None = None
    if state.revenue_yearly is not None and state.cumulative_revenue is not None:
        rev_20yr = {
            "year": list(range(len(state.revenue_yearly))),
            "annual_revenue": [round(float(v), 2) for v in state.revenue_yearly],
            "cumulative_revenue": [round(float(v), 2) for v in state.cumulative_revenue],
        }

    monthly_solar: list[float] | None = None
    if state.using_solar and state.daily_solar and len(state.daily_solar) >= 365:
        days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        monthly_solar = []
        idx = 0
        for nd in days_in_month:
            month_slice = state.daily_solar[idx : idx + nd]
            monthly_solar.append(round(float(np.mean(month_slice)), 4))
            idx += nd

    return Tier1SimulationSummaries(
        financial_expenses_20yr=fin_20yr,
        revenue_20yr=rev_20yr,
        monthly_solar_averages=monthly_solar,
    )


class SummaryKPIEvaluator:
    """Evaluative agent conforming to `EvaluativeAgentProtocol`."""

    def evaluate(self, state: SimulationState) -> dict[str, Any]:
        kpis = compute_summary_kpis(state)
        tier1 = compute_tier1_summaries(state)
        return {
            "summary_kpis": kpis.to_dict(),
            "tier1_summaries": tier1.to_dict(),
        }
