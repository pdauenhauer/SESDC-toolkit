"""Wind turbine component model and vectorized wind power calculations."""

from __future__ import annotations

import numpy as np
import pandas as pd

from engine.state import SimulationState


def calculate_power_output(
    wind_speed: float,
    rated_power: float,
    cut_in: float,
    rated_speed: float,
    cut_out: float,
) -> float:
    """Calculate single-turbine power output in Watts for a scalar wind speed."""
    if wind_speed < cut_in or wind_speed > cut_out:
        return 0
    if wind_speed < rated_speed:
        if rated_speed <= cut_in:
            return 0
        return rated_power * ((wind_speed - cut_in) / (rated_speed - cut_in)) ** 3
    return rated_power


def calculate_power_output_vectorized(
    wind_speeds: np.ndarray,
    rated_power: float,
    cut_in: float,
    rated_speed: float,
    cut_out: float,
) -> np.ndarray:
    """Vectorized cubic wind power curve across a NumPy array of wind speeds."""
    ws = np.asarray(wind_speeds, dtype=float)
    out = np.zeros_like(ws, dtype=float)

    if rated_speed > cut_in:
        cubic_mask = (ws >= cut_in) & (ws < rated_speed)
        out[cubic_mask] = rated_power * ((ws[cubic_mask] - cut_in) / (rated_speed - cut_in)) ** 3

    rated_mask = (ws >= rated_speed) & (ws <= cut_out)
    out[rated_mask] = rated_power
    return out


def calculate_hourly_wind_energy(
    data: pd.DataFrame,
    num_turbine: float,
    rated_power: float,
    cut_in_speed: float,
    rated_speed: float,
    cut_out_speed: float,
) -> list[float]:
    """Vectorized calculation of hourly wind energy across all rows of `data`."""
    if len(data) == 0:
        return []
    wind_speeds = data["Wind_speed(m/s)"].to_numpy(dtype=float)
    per_turbine = calculate_power_output_vectorized(
        wind_speeds,
        float(rated_power),
        float(cut_in_speed),
        float(rated_speed),
        float(cut_out_speed),
    )
    return (per_turbine * float(num_turbine)).tolist()


class WindModel:
    """Modular Wind Turbine component model."""

    def step(self, state: SimulationState) -> None:
        """Compute hourly wind power (kW) on `state` if wind is enabled."""
        if not state.using_wind or not state.wind_inputs:
            state.wind_power = np.zeros(state.n_rows, dtype=float)
            return

        wind_speeds = state.nlr_df["Wind_speed(m/s)"].to_numpy(dtype=float)
        per_turbine = calculate_power_output_vectorized(
            wind_speeds,
            float(state.wind_inputs["rated_power"]),
            float(state.wind_inputs["cut_in_speed"]),
            float(state.wind_inputs["rated_speed"]),
            float(state.wind_inputs["cut_out_speed"]),
        )
        raw_watts = per_turbine * float(state.wind_inputs["nameplate_capacity"])
        state.wind_power = raw_watts / 1000.0
