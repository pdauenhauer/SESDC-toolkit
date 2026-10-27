"""Central SimulationEngine ('Clock') orchestrating component models and lazy CSV serialization."""

from __future__ import annotations

import io
import numpy as np
import pandas as pd

from engine.kpis import compute_summary_kpis, compute_tier1_summaries
from engine.models.battery import BatteryModel
from engine.models.dispatch import CoupledDispatchModel
from engine.models.financial import FinancialModel, predict_multi_year_daily
from engine.models.generator import GeneratorModel
from engine.models.solar import PVModel
from engine.models.wind import WindModel
from engine.protocols import ComponentModelProtocol
from engine.state import SimulationState


def _df_to_csv(df: pd.DataFrame) -> str:
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue()


class SimulationEngine:
    """Modular simulation orchestrator executing component models against a shared `SimulationState`."""

    def __init__(
        self,
        pv_model: ComponentModelProtocol | None = None,
        wind_model: ComponentModelProtocol | None = None,
        dispatch_model: ComponentModelProtocol | None = None,
        generator_model: ComponentModelProtocol | None = None,
        battery_model: ComponentModelProtocol | None = None,
        financial_model: ComponentModelProtocol | None = None,
    ):
        self.pv_model = pv_model or PVModel()
        self.wind_model = wind_model or WindModel()
        self.dispatch_model = dispatch_model or CoupledDispatchModel()
        self.generator_model = generator_model or GeneratorModel()
        self.battery_model = battery_model or BatteryModel()
        self.financial_model = financial_model or FinancialModel()

    def run(self, state: SimulationState) -> SimulationState:
        """Execute all physical, dispatch, financial, and evaluative steps on `state`."""
        self.pv_model.step(state)
        if state.using_solar and state.solar_inputs:
            print("[SimulationEngine] Solar done, total kWh=", float(np.sum(state.solar_power)))

        self.wind_model.step(state)
        if state.using_wind and state.wind_inputs:
            print("[SimulationEngine] Wind done, total kWh=", float(np.sum(state.wind_power)))

        if state.epoch_modifiers.dispatch_mode == "legacy_sequential":
            self.generator_model.step(state)
            self.battery_model.step(state)
        else:
            self.dispatch_model.step(state)

        self.financial_model.step(state)
        state.summary_kpis = compute_summary_kpis(state)
        state.tier1_summaries = compute_tier1_summaries(state)
        return state

    @staticmethod
    def to_csv_bundle(state: SimulationState) -> dict[str, str | None]:
        """Serialize a completed `SimulationState` into the contract-compliant `csvBundle` dict."""
        csvs: dict[str, str | None] = {}

        input_df = state.nlr_df.copy()
        input_df["load_values"] = state.load_values
        csvs["input_data"] = _df_to_csv(input_df)

        hourly_df = pd.DataFrame({
            "Datetime": state.nlr_df["Datetime"].values,
            "load_kW": state.load_values,
            "solar_kW": state.solar_power,
            "wind_kW": state.wind_power,
            "diesel_kW": state.diesel_power,
            "net_energy_kW": state.net_energy,
            "battery_soc_kWh": state.battery_soc,
            "load_not_serviced_kW": state.load_not_serviced,
            "load_serviced_kW": state.hourly_load_serviced,
        })
        csvs["hourly_simulation"] = _df_to_csv(hourly_df)

        if state.daily_load is not None:
            daily_df = pd.DataFrame({
                "day": np.arange(len(state.daily_load)),
                "avg_load_kW": state.daily_load,
                "avg_solar_kW": state.daily_solar,
                "avg_wind_kW": state.daily_wind,
                "avg_diesel_kW": state.daily_diesel,
                "avg_net_kW": state.daily_net,
                "avg_load_serviced_kW": state.daily_load_serviced,
                "avg_load_not_serviced_kW": state.daily_lns,
            })
            csvs["daily_averages"] = _df_to_csv(daily_df)
        else:
            csvs["daily_averages"] = None

        if state.daily_load_serviced and len(state.daily_load_serviced) > 0:
            ls_20yr = predict_multi_year_daily(
                state.daily_load_serviced,
                state.epoch_modifiers.load_multiplier,
                years=state.horizon_years,
            )
            csvs["twenty_year_daily"] = _df_to_csv(pd.DataFrame({
                "day": np.arange(len(ls_20yr)),
                "load_serviced_kW": ls_20yr,
            }))
        else:
            csvs["twenty_year_daily"] = None

        fin_df = pd.DataFrame({
            "year": state.years_arr,
            "battery_expenses": state.battery_expenses,
            "generator_expenses": state.generator_expenses,
            "solar_expenses": state.solar_expenses,
            "wind_expenses": state.wind_expenses,
            "total_expenses": state.total_expenses,
            "cumulative_expenses": state.cumulative_expenses,
        })
        csvs["financial_expenses"] = _df_to_csv(fin_df)

        if state.revenue_yearly is not None and state.cumulative_revenue is not None:
            csvs["revenue"] = _df_to_csv(pd.DataFrame({
                "year": np.arange(len(state.revenue_yearly)),
                "annual_revenue": state.revenue_yearly,
                "cumulative_revenue": state.cumulative_revenue,
            }))
        else:
            csvs["revenue"] = None

        if state.using_solar and len(state.solar_power) >= 8760:
            reshaped = state.solar_power[:8760].reshape((365, 24))
            hm_df = pd.DataFrame(reshaped, columns=[f"hour_{h}" for h in range(24)])
            hm_df.insert(0, "day", np.arange(365))
            csvs["solar_heatmap"] = _df_to_csv(hm_df)
        else:
            csvs["solar_heatmap"] = None

        if state.using_solar and state.daily_solar and len(state.daily_solar) >= 365:
            days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
            month_names = [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
            ]
            heatmap = np.full((12, 31), np.nan)
            day_idx = 0
            for m, nd in enumerate(days_in_month):
                for d in range(nd):
                    heatmap[m, d] = state.daily_solar[day_idx]
                    day_idx += 1
            mh_df = pd.DataFrame(heatmap, columns=[f"day_{d + 1}" for d in range(31)])
            mh_df.insert(0, "month", month_names)
            csvs["monthly_heatmap"] = _df_to_csv(mh_df)
        else:
            csvs["monthly_heatmap"] = None

        return csvs
